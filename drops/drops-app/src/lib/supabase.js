import { createClient } from '@supabase/supabase-js'
import { TASKS, MOMENTS } from './constants'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)

export async function fetchDrops() {
  const { data, error } = await supabase
    .from('drops')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function fetchDrop(id) {
  const { data, error } = await supabase
    .from('drops')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export async function fetchItems(dropId) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('drop_id', dropId)
    .order('created_at', { ascending: true })
  return { data, error }
}

export async function fetchItem(id) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export async function fetchTasks(scope, scopeId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('scope', scope)
    .eq('scope_id', scopeId)
    .order('created_at', { ascending: true })
  return { data, error }
}

export async function fetchTasksForStage(scope, scopeId, stage) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('scope', scope)
    .eq('scope_id', scopeId)
    .eq('stage', stage)
    .order('created_at', { ascending: true })
  return { data, error }
}

export async function fetchMoments(scopeId, stage) {
  const { data, error } = await supabase
    .from('moments')
    .select('*')
    .eq('scope_id', scopeId)
    .eq('stage', stage)
  return { data, error }
}

export async function upsertMoment(scopeId, stage, key, value, scope = 'item') {
  const { data, error } = await supabase
    .from('moments')
    .upsert(
      { scope, scope_id: scopeId, stage, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'scope_id,stage,key' }
    )
    .select()
    .single()
  return { data, error }
}

export async function toggleTask(taskId, completed) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq('id', taskId)
    .select()
    .single()
  return { data, error }
}

export async function createDrop(name, type, dropDate) {
  const { data, error } = await supabase
    .from('drops')
    .insert({ name, type, drop_date: dropDate || null, status: 'ideation' })
    .select()
    .single()
  if (error) return { data, error }

  await initDropTasks(data.id, 'ideation')
  return { data, error }
}

export async function createItem(dropId, name) {
  const { data, error } = await supabase
    .from('items')
    .insert({ drop_id: dropId, name, stage: 'ideation' })
    .select()
    .single()
  if (error) return { data, error }

  await initItemTasks(data.id, 'ideation')
  return { data, error }
}

export async function updateDropDate(dropId, dropDate) {
  const { data, error } = await supabase
    .from('drops')
    .update({ drop_date: dropDate })
    .eq('id', dropId)
    .select()
    .single()
  return { data, error }
}

export async function updateDropStatus(dropId, status) {
  const { data, error } = await supabase
    .from('drops')
    .update({ status })
    .eq('id', dropId)
    .select()
    .single()
  return { data, error }
}

export async function advanceItemStage(itemId, nextStage) {
  const { data, error } = await supabase
    .from('items')
    .update({ stage: nextStage })
    .eq('id', itemId)
    .select()
    .single()
  if (error) return { data, error }

  await initItemTasks(itemId, nextStage)
  return { data, error }
}

export async function advanceDropStage(dropId, nextStage) {
  const { data, error } = await supabase
    .from('drops')
    .update({ status: nextStage })
    .eq('id', dropId)
    .select()
    .single()
  if (error) return { data, error }

  await initDropTasks(dropId, nextStage)
  return { data, error }
}

export async function deleteDrop(dropId) {
  const { error } = await supabase.from('drops').delete().eq('id', dropId)
  return { error }
}

export async function deleteItem(itemId) {
  const { error } = await supabase.from('items').delete().eq('id', itemId)
  return { error }
}

async function initDropTasks(dropId, stage) {
  const titles = TASKS[stage]?.drop || []
  if (!titles.length) return
  const rows = titles.map(title => ({
    scope: 'drop',
    scope_id: dropId,
    stage,
    title,
    completed: false,
  }))
  await supabase.from('tasks').insert(rows)
}

async function initItemTasks(itemId, stage) {
  const titles = TASKS[stage]?.item || []
  if (!titles.length) return
  const rows = titles.map(title => ({
    scope: 'item',
    scope_id: itemId,
    stage,
    title,
    completed: false,
  }))
  await supabase.from('tasks').insert(rows)
}

export function subscribeToTable(table, callback, filter) {
  const channel = supabase
    .channel(`${table}-changes-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter }, callback)
    .subscribe()
  return channel
}
