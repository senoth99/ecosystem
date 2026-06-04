import { prisma } from './db'
import { TASKS } from './constants'

export async function initDropTasks(dropId: string, stage: string) {
  const titles = TASKS[stage]?.drop ?? []
  if (!titles.length) return
  const existing = await prisma.task.findMany({
    where: { scope: 'drop', scopeId: dropId, stage },
    select: { title: true },
  })
  const set = new Set(existing.map(t => t.title))
  const toCreate = titles.filter(title => !set.has(title))
  if (!toCreate.length) return
  await prisma.task.createMany({
    data: toCreate.map(title => ({ scope: 'drop', scopeId: dropId, stage, title })),
  })
}

export async function initItemTasks(itemId: string, stage: string) {
  const titles = TASKS[stage]?.item ?? []
  if (!titles.length) return
  const existing = await prisma.task.findMany({
    where: { scope: 'item', scopeId: itemId, stage },
    select: { title: true },
  })
  const set = new Set(existing.map(t => t.title))
  const toCreate = titles.filter(title => !set.has(title))
  if (!toCreate.length) return
  await prisma.task.createMany({
    data: toCreate.map(title => ({ scope: 'item', scopeId: itemId, stage, title })),
  })
}
