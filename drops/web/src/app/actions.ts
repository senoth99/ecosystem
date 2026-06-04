'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { deleteAllItemPhotos } from '@/lib/itemPhotos'
import { initDropTasks, initItemTasks } from '@/lib/tasks'
import { NEXT_STAGE } from '@/lib/constants'
import { setAuthCookie, clearAuthCookie, checkPassword } from '@/lib/auth'

function revalidateItem(dropId: string | null | undefined, itemId: string) {
  revalidatePath('/products')
  if (dropId) {
    revalidatePath(`/drops/${dropId}`)
    revalidatePath(`/drops/${dropId}/items/${itemId}`)
  }
}

export async function loginAction(password: string) {
  if (!checkPassword(password)) return { error: 'Неверный пароль' }
  await setAuthCookie()
  redirect('/')
}

export async function logoutAction() {
  await clearAuthCookie()
  redirect('/login')
}

export async function createDropAction(name: string, type: string, dropDate?: string | null) {
  const drop = await prisma.drop.create({
    data: {
      name: name.trim(),
      type,
      dropDate: dropDate ? new Date(dropDate) : null,
      status: 'ideation',
    },
  })
  await initDropTasks(drop.id, 'ideation')
  revalidatePath('/')
  return { id: drop.id }
}

export async function deleteDropAction(dropId: string) {
  await prisma.task.deleteMany({
    where: { scope: 'drop', scopeId: dropId },
  })
  await prisma.moment.deleteMany({
    where: { scope: 'drop', scopeId: dropId },
  })
  await prisma.item.updateMany({
    where: { dropId },
    data: { dropId: null },
  })
  await prisma.drop.delete({ where: { id: dropId } })
  revalidatePath('/')
  revalidatePath('/archive')
  revalidatePath('/products')
  redirect('/')
}

export async function createItemAction(dropId: string, name: string) {
  const drop = await prisma.drop.findUniqueOrThrow({ where: { id: dropId } })
  const stage = drop.status === 'dropped' ? 'finalization' : drop.status
  const item = await prisma.item.create({
    data: { dropId, name: name.trim(), stage },
  })
  await initItemTasks(item.id, stage)
  revalidatePath(`/drops/${dropId}`)
  revalidatePath('/products')
}

export async function deleteItemAction(dropId: string, itemId: string) {
  return unlinkProductFromDropAction(itemId).then(() => {
    revalidatePath(`/drops/${dropId}`)
  })
}

export async function attachProductToDropAction(dropId: string, itemId: string) {
  return attachExistingProductAction(dropId, itemId)
}

export async function createProductAction(name: string, notes?: string | null) {
  const item = await prisma.item.create({
    data: {
      name: name.trim(),
      notes: (notes ?? '').trim(),
      stage: 'ideation',
    },
  })
  revalidatePath('/products')
  return { id: item.id }
}

export async function linkProductToDropAction(itemId: string, dropId: string) {
  const [item, drop] = await Promise.all([
    prisma.item.findUniqueOrThrow({ where: { id: itemId } }),
    prisma.drop.findUniqueOrThrow({ where: { id: dropId } }),
  ])
  if (item.dropId) return { error: 'Позиция уже в дропе' }

  const stage = drop.status === 'dropped' ? 'finalization' : drop.status
  await prisma.item.update({ where: { id: itemId }, data: { dropId, stage } })

  const taskCount = await prisma.task.count({
    where: { scope: 'item', scopeId: itemId },
  })
  if (taskCount === 0) await initItemTasks(itemId, stage)

  revalidatePath('/products')
  revalidatePath(`/drops/${dropId}`)
  return { ok: true }
}

export async function unlinkProductFromDropAction(itemId: string) {
  const item = await prisma.item.findUniqueOrThrow({ where: { id: itemId } })
  const prevDropId = item.dropId
  await prisma.item.update({ where: { id: itemId }, data: { dropId: null } })
  revalidatePath('/products')
  if (prevDropId) revalidatePath(`/drops/${prevDropId}`)
  return { ok: true }
}

export async function deleteProductAction(itemId: string) {
  const item = await prisma.item.findUniqueOrThrow({ where: { id: itemId } })
  const dropId = item.dropId

  await prisma.task.deleteMany({ where: { scope: 'item', scopeId: itemId } })
  await prisma.moment.deleteMany({ where: { scope: 'item', scopeId: itemId } })
  await deleteAllItemPhotos(itemId)
  await prisma.item.delete({ where: { id: itemId } })

  revalidatePath('/products')
  if (dropId) revalidatePath(`/drops/${dropId}`)
}

export async function updateProductNotesAction(itemId: string, notes: string) {
  await prisma.item.update({
    where: { id: itemId },
    data: { notes: notes.trim() },
  })
  revalidatePath('/products')
  revalidatePath(`/products/${itemId}`)
}

export async function attachExistingProductAction(dropId: string, itemId: string) {
  const item = await prisma.item.findUniqueOrThrow({ where: { id: itemId } })
  if (item.dropId) return { error: 'Позиция уже в дропе' }
  return linkProductToDropAction(itemId, dropId)
}

export async function updateDropDateAction(dropId: string, dropDate: string | null) {
  await prisma.drop.update({
    where: { id: dropId },
    data: { dropDate: dropDate ? new Date(dropDate) : null },
  })
  revalidatePath(`/drops/${dropId}`)
  revalidatePath('/')
  revalidatePath('/archive')
}

export async function updateDropStatusAction(dropId: string, status: string) {
  if (status === 'dropped') {
    const items = await prisma.item.findMany({ where: { dropId }, select: { id: true } })
    const [dropTasks, itemTasks] = await Promise.all([
      prisma.task.findMany({
        where: { scope: 'drop', scopeId: dropId, stage: 'finalization' },
      }),
      items.length
        ? prisma.task.findMany({
            where: {
              scope: 'item',
              scopeId: { in: items.map(item => item.id) },
              stage: 'finalization',
            },
          })
        : Promise.resolve([]),
    ])
    const finalTasks = [...dropTasks, ...itemTasks]
    const allFinalTasksDone = finalTasks.length > 0 && finalTasks.every(task => task.completed)

    if (!allFinalTasksDone) {
      return { error: 'Закрой все задачи финального этапа перед дропом' }
    }
  }

  await prisma.drop.update({ where: { id: dropId }, data: { status } })
  if (status !== 'dropped') await initDropTasks(dropId, status)
  revalidatePath(`/drops/${dropId}`)
  revalidatePath('/')
  revalidatePath('/archive')
  return { ok: true }
}

export async function toggleTaskAction(taskId: string, completed: boolean, path: string) {
  await prisma.task.update({
    where: { id: taskId },
    data: { completed, completedAt: completed ? new Date() : null },
  })
  revalidatePath(path)
}

export async function upsertMomentAction(
  scopeId: string,
  stage: string,
  key: string,
  value: string,
  path: string,
  scope = 'item',
) {
  await prisma.moment.upsert({
    where: { scope_scopeId_stage_key: { scope, scopeId, stage, key } },
    create: { scope, scopeId, stage, key, value },
    update: { value },
  })
  revalidatePath(path)
}

export async function advanceItemStageAction(itemId: string, dropId: string) {
  const item = await prisma.item.findUniqueOrThrow({ where: { id: itemId } })
  const next = NEXT_STAGE[item.stage]
  if (!next) return { error: 'Нет следующего этапа' }

  const tasks = await prisma.task.findMany({
    where: { scope: 'item', scopeId: itemId, stage: item.stage },
  })
  const allTasksDone = tasks.length === 0 || tasks.every(t => t.completed)

  if (!allTasksDone) {
    return { error: 'Выполни все задачи' }
  }

  await prisma.item.update({ where: { id: itemId }, data: { stage: next } })
  await initItemTasks(itemId, next)
  revalidatePath(`/drops/${dropId}/items/${itemId}`)
  revalidatePath(`/drops/${dropId}`)
  return { ok: true }
}

export async function advanceDropStageAction(dropId: string) {
  const NEXT: Record<string, string> = { ideation: 'development', development: 'finalization' }
  const drop = await prisma.drop.findUniqueOrThrow({ where: { id: dropId } })
  const next = NEXT[drop.status]
  if (!next) return { error: 'Нет следующего этапа' }

  const items = await prisma.item.findMany({ where: { dropId }, select: { id: true } })
  const [dropTasks, itemTasks] = await Promise.all([
    prisma.task.findMany({
      where: { scope: 'drop', scopeId: dropId, stage: drop.status },
    }),
    items.length
      ? prisma.task.findMany({
          where: {
            scope: 'item',
            scopeId: { in: items.map(item => item.id) },
            stage: drop.status,
          },
        })
      : Promise.resolve([]),
  ])
  const stageTasks = [...dropTasks, ...itemTasks]
  const allStageTasksDone = stageTasks.length === 0 || stageTasks.every(task => task.completed)

  if (!allStageTasksDone) {
    return { error: 'Закрой все задачи текущего этапа перед переходом' }
  }

  await prisma.drop.update({ where: { id: dropId }, data: { status: next } })
  await initDropTasks(dropId, next)
  revalidatePath(`/drops/${dropId}`)
  revalidatePath('/')
  revalidatePath('/archive')
  return { ok: true }
}

export async function updateDropInfoAction(dropId: string, name: string, type: string) {
  await prisma.drop.update({ where: { id: dropId }, data: { name: name.trim(), type } })
  revalidatePath(`/drops/${dropId}`)
  revalidatePath('/')
  revalidatePath('/archive')
}

export async function updateItemNameAction(
  itemId: string,
  dropId: string | null,
  name: string,
) {
  await prisma.item.update({ where: { id: itemId }, data: { name: name.trim() } })
  revalidateItem(dropId, itemId)
}

export async function toggleItemSampleAction(
  itemId: string,
  dropId: string | null,
  samplePrinted: boolean,
) {
  await prisma.item.update({ where: { id: itemId }, data: { samplePrinted } })
  revalidateItem(dropId, itemId)
}
