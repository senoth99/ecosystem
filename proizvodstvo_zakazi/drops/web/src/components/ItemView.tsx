'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from './AppShell'
import Modal from './Modal'
import ItemMeta from './ItemMeta'
import { STAGES, STAGE_INDEX, NEXT_STAGE } from '@/lib/constants'
import { btnOutlineLockedClass } from '@/lib/theme'
import { toggleTaskAction, advanceItemStageAction, updateItemNameAction } from '@/app/actions'

type Task = { id: string; title: string; completed: boolean }
type Item = {
  id: string
  name: string
  stage: string
  dropId: string | null
  photo: string | null
  photos?: { id: string }[]
  samplePrinted: boolean
}
type Drop = { id: string; name: string }

function TaskItem({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => e.key === 'Enter' && onToggle()}
      className={`task-row ${task.completed ? 'task-row--done' : 'task-row--open'}`}
    >
      <span
        className={`mt-px flex h-[17px] w-[17px] shrink-0 items-center justify-center border-2 ${
          task.completed ? 'border-[#14C97A] bg-[#14C97A]' : 'border-[#535454] bg-transparent'
        }`}
      >
        {task.completed && <span className="text-[10px] font-extrabold text-[#050505]">✓</span>}
      </span>
      <span className={`text-[13px] leading-snug ${task.completed ? 'text-[#C8C8C8] line-through' : 'text-white'}`}>
        {task.title}
      </span>
    </div>
  )
}

function StageSection({
  stage,
  stageLabel,
  tasks,
  active,
  done,
  onToggle,
}: {
  stage: string
  stageLabel: string
  tasks: Task[]
  active: boolean
  done: boolean
  onToggle: (taskId: string, completed: boolean) => void
}) {
  const doneTasks = tasks.filter(t => t.completed).length
  const showBody = tasks.length > 0 || (active && stage === 'finalization')

  return (
    <div className="mb-2 overflow-hidden border border-[#3D5248] bg-[#1A1F1C]">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 ${
          active || done ? 'border-b border-[#3D5248]' : ''
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`h-2 w-2 shrink-0 ${active ? 'pulse-dot bg-[#14C97A]' : done ? 'bg-[#14C97A]' : 'bg-[#0E7A45]'}`}
          />
          <span className={`text-[11px] uppercase tracking-widest ${active ? 'font-semibold text-white' : 'text-white'}`}>
            {stageLabel}
          </span>
          {done && <span className="label-caps text-[#14C97A]">✓ завершён</span>}
        </div>
        {tasks.length > 0 && (
          <span className={`label-caps ${active ? 'text-[#14C97A]' : 'text-[#C8C8C8]'}`}>
            {doneTasks}/{tasks.length}
          </span>
        )}
      </div>

      {showBody && (
        <div className="p-5">
          {tasks.length > 0 && (
            <div>
              <p className="label-caps mb-3">Задачи</p>
              <div className="flex flex-col gap-1">
                {tasks.map(task => (
                  <TaskItem key={task.id} task={task} onToggle={() => onToggle(task.id, !task.completed)} />
                ))}
              </div>
            </div>
          )}
          {active && stage === 'finalization' && (
            <p className="label-caps mt-4 text-center text-[#14C97A]">Позиция на финальном этапе</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function ItemView({
  drop,
  item,
  tasksByStage,
}: {
  drop: Drop
  item: Item
  tasksByStage: Record<string, Task[]>
}) {
  const path = `/drops/${drop.id}/items/${item.id}`
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [renameModal, setRenameModal] = useState(false)
  const [renameValue, setRenameValue] = useState(item.name)

  const nextStageKey = NEXT_STAGE[item.stage]
  const nextStageLabel = STAGES.find(s => s.key === nextStageKey)?.label
  const currentTasks = tasksByStage[item.stage] ?? []
  const canAdvanceItem = currentTasks.length === 0 || currentTasks.every(t => t.completed)

  return (
    <AppShell title={item.name}>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={`/drops/${drop.id}`} className="btn-ghost inline-flex">
          ← В ДРОП
        </Link>
        <Link href={`/products/${item.id}`} className="btn-ghost inline-flex">
          КАТАЛОГ ПРОДУКТА
        </Link>
      </div>

      <div className="card mb-5 p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-[#3D5248] pb-5">
          <div className="min-w-0">
            <p className="label-caps mb-1.5">Название</p>
            <p className="break-words text-base font-medium text-white">{item.name}</p>
            <p className="mt-2 text-xs text-[#C8C8C8]">{drop.name}</p>
          </div>
          <button type="button" className="btn-ghost" onClick={() => { setRenameValue(item.name); setRenameModal(true) }}>
            ИЗМЕНИТЬ
          </button>
        </div>
        <ItemMeta item={item} embedded />
      </div>

      {STAGES.map(s => (
        <StageSection
          key={s.key}
          stage={s.key}
          stageLabel={s.label}
          tasks={tasksByStage[s.key] ?? []}
          active={s.key === item.stage}
          done={STAGE_INDEX[item.stage] > STAGE_INDEX[s.key]}
          onToggle={(taskId, completed) =>
            startTransition(() => toggleTaskAction(taskId, completed, path))
          }
        />
      ))}

      {item.stage !== 'finalization' && nextStageLabel && (
        <button
          type="button"
          className={`btn-outline mt-2 w-full ${btnOutlineLockedClass(!canAdvanceItem)}`}
          disabled={pending || !canAdvanceItem}
          title={canAdvanceItem ? 'Перейти к следующему этапу' : 'Сначала отметь все задачи текущего этапа'}
          onClick={() => startTransition(async () => {
            const r = await advanceItemStageAction(item.id, drop.id)
            if (r?.error) alert(r.error)
            else router.refresh()
          })}
        >
          {pending ? 'ПЕРЕХОД...' : 'ПЕРЕЙТИ НА СЛЕДУЮЩИЙ ЭТАП'}
        </button>
      )}

      <Modal open={renameModal} onClose={() => setRenameModal(false)} title="НАЗВАНИЕ ПОЗИЦИИ">
        <form
          onSubmit={async e => {
            e.preventDefault()
            const name = renameValue.trim()
            if (!name) return
            await updateItemNameAction(item.id, drop.id, name)
            setRenameModal(false)
            router.refresh()
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className="label-caps mb-1.5 block">Название</label>
            <input
              placeholder="Например: OVERSIZED HOODIE BLACK"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="btn-outline w-full" disabled={!renameValue.trim()}>
            СОХРАНИТЬ
          </button>
        </form>
      </Modal>
    </AppShell>
  )
}
