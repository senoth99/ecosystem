import { STAGE_INDEX, TASKS } from './constants'

const DROP_STAGE_ORDER: Record<string, number> = { ideation: 0, development: 1, finalization: 2, dropped: 3 }

const IDEATION_ITEM_CONCEPT_TASK = TASKS.ideation.item[0]

export function getDropStageBarState(dropStatus: string, stageIndex: number) {
  const cur = DROP_STAGE_ORDER[dropStatus] ?? 0
  if (dropStatus === 'dropped') return { done: true, active: false }
  return { done: stageIndex < cur, active: stageIndex === cur }
}

export function getItemStageBarState(itemStage: string, stageIndex: number) {
  const cur = STAGE_INDEX[itemStage] ?? 0
  return { done: stageIndex < cur, active: stageIndex === cur }
}

export function getIdeationSubstageIndex(
  dropStatus: string,
  items: { id: string; stage: string }[],
  itemTasks: Record<string, { title: string; completed: boolean }[]>,
  dropIdeationTasks: { completed: boolean }[],
) {
  if (dropStatus !== 'ideation') return null
  if (dropIdeationTasks.some(t => !t.completed)) return 0

  const ideationItems = items.filter(it => it.stage === 'ideation')
  if (ideationItems.length === 0) return 0

  for (const item of ideationItems) {
    const tasks = itemTasks[item.id] || []
    const give = tasks.find(t => t.title === IDEATION_ITEM_CONCEPT_TASK)
    if (!give || !give.completed) return 0
  }

  return 1
}

export function formatCountdown(date: Date | string | null) {
  if (!date) return null
  const diff = new Date(date).getTime() - Date.now()
  if (diff < 0) {
    const days = Math.floor(Math.abs(diff) / 86400000)
    return { label: `${days > 0 ? `${days}д ` : ''}назад`, color: '#14C97A' as const }
  }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return { label: `${days}д ${hours}ч до дропа`, color: '#FB923C' as const }
  if (hours > 0) return { label: `${hours}ч ${mins}м до дропа`, color: '#F0B429' as const }
  return { label: `${mins}м до дропа`, color: '#14C97A' as const }
}

export function formatDropDate(date: Date | string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
