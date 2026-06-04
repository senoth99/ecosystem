import { STAGE_INDEX, TASKS } from './constants'

const DROP_STAGE_ORDER = { ideation: 0, development: 1, finalization: 2, dropped: 3 }

const IDEATION_ITEM_CONCEPT_TASK = TASKS.ideation.item[0]

export function getDropStageBarState(dropStatus, stageIndex) {
  const cur = DROP_STAGE_ORDER[dropStatus] ?? 0
  if (dropStatus === 'dropped') return { done: true, active: false }
  return { done: stageIndex < cur, active: stageIndex === cur }
}

export function getItemStageBarState(itemStage, stageIndex) {
  const cur = STAGE_INDEX[itemStage] ?? 0
  return { done: stageIndex < cur, active: stageIndex === cur }
}

/**
 * Активный подэтап ideation: 0 — идейность (концепт + задачи коллекции),
 * 1 — согласование (первые задачи позиций закрыты, идёт согласование дизайнов).
 */
export function getIdeationSubstageIndex(dropStatus, items, itemTasks, dropIdeationTasks) {
  if (dropStatus !== 'ideation') return null
  const dropIncomplete = (dropIdeationTasks || []).filter(t => !t.completed)
  if (dropIncomplete.length > 0) return 0

  const ideationItems = items.filter(it => it.stage === 'ideation')
  if (ideationItems.length === 0) return 0

  for (const item of ideationItems) {
    const tasks = itemTasks[item.id] || []
    const give = tasks.find(t => t.title === IDEATION_ITEM_CONCEPT_TASK)
    if (!give || !give.completed) return 0
  }

  return 1
}
