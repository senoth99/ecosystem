import { prisma } from './db'

export async function getDropsWithStats() {
  const drops = await prisma.drop.findMany({ orderBy: { createdAt: 'desc' } })
  const stats: Record<string, { itemCount: number; tasksDone: number; tasksTotal: number }> = {}

  for (const drop of drops) {
    const items = await prisma.item.findMany({ where: { dropId: drop.id }, select: { id: true } })
    const dropTasks = await prisma.task.findMany({
      where: { scope: 'drop', scopeId: drop.id },
      select: { completed: true },
    })
    let itemTasksDone = 0
    let itemTasksTotal = 0
    for (const item of items) {
      const it = await prisma.task.findMany({
        where: { scope: 'item', scopeId: item.id },
        select: { completed: true },
      })
      itemTasksDone += it.filter(t => t.completed).length
      itemTasksTotal += it.length
    }
    stats[drop.id] = {
      itemCount: items.length,
      tasksDone: dropTasks.filter(t => t.completed).length + itemTasksDone,
      tasksTotal: dropTasks.length + itemTasksTotal,
    }
  }

  return { drops, stats }
}

export async function getDropPageData(dropId: string) {
  const drop = await prisma.drop.findUnique({ where: { id: dropId } })
  if (!drop) return null
  const items = await prisma.item.findMany({
    where: { dropId },
    orderBy: { createdAt: 'asc' },
    include: {
      photos: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], take: 1, select: { id: true } },
    },
  })
  const itemTasks: Record<string, { id: string; title: string; completed: boolean }[]> = {}
  const taskStage = drop.status === 'dropped' ? 'finalization' : drop.status
  for (const item of items) {
    itemTasks[item.id] = await prisma.task.findMany({
      where: { scope: 'item', scopeId: item.id, stage: taskStage },
      select: { id: true, title: true, completed: true },
      orderBy: { createdAt: 'asc' },
    })
  }
  const collectionTasks = await prisma.task.findMany({
    where: { scope: 'drop', scopeId: dropId, stage: taskStage },
    orderBy: { createdAt: 'asc' },
  })
  const dropMoments = await prisma.moment.findMany({
    where: { scope: 'drop', scopeId: dropId, stage: taskStage },
  })
  const ideationMoments = await prisma.moment.findMany({
    where: { scope: 'drop', scopeId: dropId, stage: 'ideation' },
  })
  const dropIdeationTasks =
    drop.status === 'ideation'
      ? await prisma.task.findMany({
          where: { scope: 'drop', scopeId: dropId, stage: 'ideation' },
          select: { id: true, title: true, completed: true },
          orderBy: { createdAt: 'asc' },
        })
      : []
  return { drop, items, itemTasks, collectionTasks, taskStage, dropMoments, dropIdeationTasks, ideationMoments }
}

export async function getItemPageData(dropId: string, itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { photos: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
  })
  if (!item || item.dropId !== dropId) return null
  const drop = await prisma.drop.findUnique({ where: { id: dropId } })
  if (!drop) return null

  const tasksByStage: Record<string, Awaited<ReturnType<typeof prisma.task.findMany>>> = {}

  for (const stage of ['ideation', 'development', 'finalization']) {
    tasksByStage[stage] = await prisma.task.findMany({
      where: { scope: 'item', scopeId: itemId, stage },
      orderBy: { createdAt: 'asc' },
    })
  }

  return { drop, item, tasksByStage }
}

export type ProductListRow = {
  id: string
  name: string
  notes: string
  stage: string
  dropId: string | null
  dropName: string | null
  samplePrinted: boolean
  createdAt: Date
  thumbPhotoId: string | null
  tasksDone: number
  tasksTotal: number
}

export async function getProductsListData(): Promise<ProductListRow[]> {
  const items = await prisma.item.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      drop: { select: { name: true } },
      photos: { orderBy: { createdAt: 'asc' }, take: 1, select: { id: true } },
    },
  })

  const rows: ProductListRow[] = []
  for (const item of items) {
    const tasks = await prisma.task.findMany({
      where: { scope: 'item', scopeId: item.id },
      select: { completed: true },
    })
    rows.push({
      id: item.id,
      name: item.name,
      notes: item.notes ?? '',
      stage: item.stage,
      dropId: item.dropId,
      dropName: item.drop?.name ?? null,
      samplePrinted: item.samplePrinted,
      createdAt: item.createdAt,
      thumbPhotoId: item.photos[0]?.id ?? null,
      tasksDone: tasks.filter(t => t.completed).length,
      tasksTotal: tasks.length,
    })
  }
  return rows
}

export async function getProductCatalogData(itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      drop: { select: { id: true, name: true, status: true } },
      photos: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!item) return null

  const drops = await prisma.drop.findMany({
    where: { status: { not: 'dropped' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, status: true },
  })

  const tasksByStage: Record<string, { id: string; title: string; completed: boolean }[]> = {}
  for (const stage of ['ideation', 'development', 'finalization']) {
    tasksByStage[stage] = await prisma.task.findMany({
      where: { scope: 'item', scopeId: itemId, stage },
      select: { id: true, title: true, completed: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  return { item, drops, tasksByStage }
}

export async function getUnlinkedProducts() {
  return prisma.item.findMany({
    where: { dropId: null },
    orderBy: { name: 'asc' },
    include: {
      photos: { orderBy: { createdAt: 'asc' }, take: 1 },
    },
  })
}
