import PocketBase from 'pocketbase'
import { TASKS } from './constants'

/** В dev запросы идут на origin Vite (тот же хост что и SPA) → proxy `/api` на PB по IPv4. */
function resolvePocketBaseUrl() {
  if (import.meta.env.DEV) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin
    }
    return 'http://127.0.0.1:8090'
  }
  const raw = import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090'
  return String(raw).replace(/localhost/g, '127.0.0.1')
}

export const pb = new PocketBase(resolvePocketBaseUrl())
pb.autoCancellation(false)

function ok(data) { return { data, error: null } }
function fail(e) { return { data: null, error: e } }

export async function fetchDrops() {
  try {
    // Не sort по `created` — в этих коллекциях поля нет в схеме, PB отдаёт 400.
    const data = await pb.collection('drops').getFullList({ sort: '-id' })
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function fetchDrop(id) {
  try {
    const data = await pb.collection('drops').getOne(id)
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function fetchItems(dropId) {
  try {
    const data = await pb.collection('items').getFullList({
      filter: `drop_id = "${dropId}"`,
      sort: '+id',
    })
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function fetchItem(id) {
  try {
    const data = await pb.collection('items').getOne(id)
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function fetchTasksForStage(scope, scopeId, stage) {
  try {
    const data = await pb.collection('tasks').getFullList({
      filter: `scope = "${scope}" && scope_id = "${scopeId}" && stage = "${stage}"`,
      sort: '+id',
    })
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function fetchMoments(scopeId, stage, scope = 'item') {
  try {
    const data = await pb.collection('moments').getFullList({
      filter: `scope = "${scope}" && scope_id = "${scopeId}" && stage = "${stage}"`,
    })
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function upsertMoment(scopeId, stage, key, value, scope = 'item') {
  try {
    let existing = null
    try {
      existing = await pb.collection('moments').getFirstListItem(
        `scope = "${scope}" && scope_id = "${scopeId}" && stage = "${stage}" && key = "${key}"`
      )
    } catch (_) {}
    const payload = { scope, scope_id: scopeId, stage, key, value }
    const data = existing
      ? await pb.collection('moments').update(existing.id, payload)
      : await pb.collection('moments').create(payload)
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function toggleTask(taskId, completed) {
  try {
    const data = await pb.collection('tasks').update(taskId, {
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function createDrop(name, type, dropDate) {
  try {
    const data = await pb.collection('drops').create({
      name, type,
      drop_date: dropDate || null,
      status: 'ideation',
    })
    await initDropTasks(data.id, 'ideation')
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function createItem(dropId, name) {
  try {
    const data = await pb.collection('items').create({
      drop_id: dropId, name, stage: 'ideation',
    })
    await initItemTasks(data.id, 'ideation')
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function updateDropDate(dropId, dropDate) {
  try {
    const data = await pb.collection('drops').update(dropId, { drop_date: dropDate || null })
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function updateDropStatus(dropId, status) {
  try {
    if (status === 'dropped') {
      const { data: dropTasks, error: dropTasksErr } = await fetchTasksForStage('drop', dropId, 'finalization')
      if (dropTasksErr) return fail(dropTasksErr)
      const items = await pb.collection('items').getFullList({
        filter: `drop_id = "${dropId}"`,
      }).catch(() => [])
      const itemResults = await Promise.all(
        items.map(item => fetchTasksForStage('item', item.id, 'finalization'))
      )
      for (const res of itemResults) {
        if (res.error) return fail(res.error)
      }
      const allTasks = [
        ...dropTasks,
        ...itemResults.flatMap(r => r.data),
      ]
      if (allTasks.some(t => !t.completed)) {
        return fail('Закрой все задачи финального этапа перед дропом')
      }
    }
    const data = await pb.collection('drops').update(dropId, { status })
    if (status !== 'dropped') {
      await initDropTasks(dropId, status)
    }
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function advanceItemStage(itemId, nextStage) {
  try {
    const item = await pb.collection('items').getOne(itemId)
    const { data: stageTasks, error: tasksErr } = await fetchTasksForStage('item', itemId, item.stage)
    if (tasksErr) return fail(tasksErr)
    if (stageTasks.length > 0 && !stageTasks.every(t => t.completed)) {
      return fail('Выполни все задачи')
    }
    const data = await pb.collection('items').update(itemId, { stage: nextStage })
    await initItemTasks(itemId, nextStage)
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function advanceDropStage(dropId, nextStage) {
  try {
    const drop = await pb.collection('drops').getOne(dropId)
    const currentStage = drop.status
    const { data: dropStageTasks, error: dropTasksErr } = await fetchTasksForStage('drop', dropId, currentStage)
    if (dropTasksErr) return fail(dropTasksErr)
    const items = await pb.collection('items').getFullList({
      filter: `drop_id = "${dropId}"`,
    }).catch(() => [])
    const itemResults = await Promise.all(
      items.map(item => fetchTasksForStage('item', item.id, currentStage))
    )
    for (const res of itemResults) {
      if (res.error) return fail(res.error)
    }
    const stageTasks = [
      ...dropStageTasks,
      ...itemResults.flatMap(r => r.data),
    ]
    if (!(stageTasks.length === 0 || stageTasks.every(t => t.completed))) {
      return fail('Закрой все задачи текущего этапа')
    }
    const data = await pb.collection('drops').update(dropId, { status: nextStage })
    await initDropTasks(dropId, nextStage)
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function deleteDrop(dropId) {
  try {
    const items = await pb.collection('items').getFullList({
      filter: `drop_id = "${dropId}"`,
    }).catch(() => [])
    for (const item of items) {
      await deleteScopeRecords('item', item.id)
      await pb.collection('items').delete(item.id)
    }
    await deleteScopeRecords('drop', dropId)
    await pb.collection('drops').delete(dropId)
    return { error: null }
  } catch (e) { return fail(e) }
}

export async function deleteItem(itemId) {
  try {
    await deleteScopeRecords('item', itemId)
    await pb.collection('items').delete(itemId)
    return { error: null }
  } catch (e) { return fail(e) }
}

export function getItemPhotoUrl(item, thumb = '80x80') {
  if (!item?.photo) return null
  return pb.files.getUrl(item, item.photo, thumb ? { thumb } : undefined)
}

export async function updateItemPhoto(itemId, file) {
  try {
    const formData = new FormData()
    formData.append('photo', file ?? '')
    const data = await pb.collection('items').update(itemId, formData)
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function toggleItemSample(itemId, samplePrinted) {
  try {
    const data = await pb.collection('items').update(itemId, { sample_printed: samplePrinted })
    return ok(data)
  } catch (e) { return fail(e) }
}

export async function updateItemName(itemId, name) {
  try {
    const data = await pb.collection('items').update(itemId, { name: name.trim() })
    return ok(data)
  } catch (e) { return fail(e) }
}

async function deleteScopeRecords(scope, scopeId) {
  const [tasks, moments] = await Promise.all([
    pb.collection('tasks').getFullList({ filter: `scope = "${scope}" && scope_id = "${scopeId}"` }).catch(() => []),
    pb.collection('moments').getFullList({ filter: `scope = "${scope}" && scope_id = "${scopeId}"` }).catch(() => []),
  ])
  await Promise.all([
    ...tasks.map(t => pb.collection('tasks').delete(t.id)),
    ...moments.map(m => pb.collection('moments').delete(m.id)),
  ])
}

async function initDropTasks(dropId, stage) {
  const titles = TASKS[stage]?.drop || []
  if (!titles.length) return
  const existing = await pb.collection('tasks').getFullList({
    filter: `scope = "drop" && scope_id = "${dropId}" && stage = "${stage}"`,
    fields: 'title',
  }).catch(() => [])
  const existingTitles = new Set(existing.map(t => t.title))
  const toCreate = titles.filter(title => !existingTitles.has(title))
  await Promise.all(toCreate.map(title =>
    pb.collection('tasks').create({ scope: 'drop', scope_id: dropId, stage, title, completed: false })
  ))
}

async function initItemTasks(itemId, stage) {
  const titles = TASKS[stage]?.item || []
  if (!titles.length) return
  const existing = await pb.collection('tasks').getFullList({
    filter: `scope = "item" && scope_id = "${itemId}" && stage = "${stage}"`,
    fields: 'title',
  }).catch(() => [])
  const existingTitles = new Set(existing.map(t => t.title))
  const toCreate = titles.filter(title => !existingTitles.has(title))
  await Promise.all(toCreate.map(title =>
    pb.collection('tasks').create({ scope: 'item', scope_id: itemId, stage, title, completed: false })
  ))
}
