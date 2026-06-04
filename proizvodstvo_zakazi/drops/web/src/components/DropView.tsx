'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from './AppShell'
import Badge from './Badge'
import Modal from './Modal'
import { ItemPhotoThumb } from './ItemMeta'
import DropIdeationMoments from './DropIdeationMoments'
import DropMockupEditor from './DropMockup'
import {
  STAGES,
  IDEATION_SUBSTAGES,
  STATUS_CONFIG,
  DROP_TYPES,
} from '@/lib/constants'
import {
  getDropStageBarState,
  getItemStageBarState,
  getIdeationSubstageIndex,
  formatCountdown,
  formatDropDate,
} from '@/lib/stageUtils'
import { STAGE_ACTIVE_COLOR, STAGE_DONE_COLOR, STAGE_UPCOMING_COLOR, btnOutlineLockedClass } from '@/lib/theme'
import {
  createItemAction,
  attachExistingProductAction,
  deleteDropAction,
  deleteItemAction,
  updateDropDateAction,
  updateDropStatusAction,
  toggleTaskAction,
  advanceDropStageAction,
  updateDropInfoAction,
} from '@/app/actions'

type Drop = { id: string; name: string; type: string; dropDate: Date | null; status: string; photo: string | null }
type CatalogProduct = { id: string; name: string; photos: { id: string }[] }
type Item = {
  id: string
  name: string
  stage: string
  dropId: string | null
  photo: string | null
  photos?: { id: string }[]
  samplePrinted: boolean
}
type Task = { id: string; title: string; completed: boolean }
type Moment = { key: string; value: string }

const NEXT_DROP_STATUS: Record<string, string> = { ideation: 'development', development: 'finalization' }
const NEXT_DROP_LABEL: Record<string, string> = { ideation: '→ ПРОРАБОТКА', development: '→ ФИНАЛ' }

function TaskCheckbox({
  task,
  onToggle,
}: {
  task: Task
  onToggle: () => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => e.key === 'Enter' && onToggle()}
      className={`task-row ${task.completed ? 'task-row--done' : 'task-row--open'}`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border-2 ${
          task.completed ? 'border-[#14C97A] bg-[#14C97A]' : 'border-[#535454] bg-transparent'
        }`}
      >
        {task.completed && <span className="text-[10px] font-bold text-[#050505]">✓</span>}
      </span>
      <span
        className={`text-[13px] leading-snug ${task.completed ? 'text-[#C8C8C8] line-through' : 'text-white'}`}
      >
        {task.title}
      </span>
    </div>
  )
}

function ItemCard({
  item,
  dropId,
  tasks,
  onDelete,
}: {
  item: Item
  dropId: string
  tasks: Task[]
  onDelete: () => void
}) {
  const done = tasks.filter(t => t.completed).length
  const total = tasks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const stageInfo = STAGES.find(s => s.key === item.stage)

  return (
    <Link
      href={`/drops/${dropId}/items/${item.id}`}
      className="card flex cursor-pointer flex-wrap items-start gap-4 p-4"
    >
      <ItemPhotoThumb item={item} size={48} />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-medium text-white">{item.name}</span>
          <span className="border border-[#14C97A] bg-[#1A1F1C] px-1.5 py-px text-[10px] uppercase tracking-widest text-[#14C97A]">
            {stageInfo?.short}
          </span>
          {item.samplePrinted && (
            <span className="border border-[#14C97A] px-1.5 py-px text-[10px] uppercase tracking-widest text-[#14C97A]">
              СЕМПЛ
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {STAGES.map((s, i) => {
            const { done: stDone, active } = getItemStageBarState(item.stage, i)
            return (
              <div
                key={s.key}
                className="h-0.5 flex-1"
                style={{
                  backgroundColor: active ? STAGE_ACTIVE_COLOR : stDone ? STAGE_DONE_COLOR : STAGE_UPCOMING_COLOR,
                }}
              />
            )
          })}
        </div>
        {total > 0 && (
          <p className="label-caps mt-1.5 text-[10px]">
            Задачи: {done}/{total} ({pct}%)
          </p>
        )}
      </div>
      <button
        type="button"
        className="icon-btn-hit ml-auto shrink-0 border-0 bg-transparent text-xl leading-none text-white"
        aria-label="Удалить позицию"
        onClick={e => { e.preventDefault(); onDelete() }}
      >
        ×
      </button>
    </Link>
  )
}

export default function DropView({
  drop,
  items,
  itemTasks,
  collectionTasks,
  dropIdeationTasks,
  ideationMoments,
  catalogProducts = [],
}: {
  drop: Drop
  items: Item[]
  itemTasks: Record<string, Task[]>
  collectionTasks: Task[]
  dropIdeationTasks: Task[]
  ideationMoments: Moment[]
  catalogProducts?: CatalogProduct[]
}) {
  const router = useRouter()
  const path = `/drops/${drop.id}`
  const [pending, startTransition] = useTransition()
  const [addModal, setAddModal] = useState(false)
  const [addMode, setAddMode] = useState<'new' | 'catalog'>('new')
  const [catalogPickId, setCatalogPickId] = useState('')
  const [dateModal, setDateModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [itemName, setItemName] = useState('')
  const [dateVal, setDateVal] = useState('')
  const [editName, setEditName] = useState(drop.name)
  const [editType, setEditType] = useState(drop.type)

  const status = STATUS_CONFIG[drop.status] ?? STATUS_CONFIG.ideation
  const nextDropStatus = NEXT_DROP_STATUS[drop.status]
  const countdown = formatCountdown(drop.dropDate)
  const ideationSubIdx = getIdeationSubstageIndex(drop.status, items, itemTasks, dropIdeationTasks)

  const stageTaskGroups = [collectionTasks, ...items.map(item => itemTasks[item.id] ?? [])]
  const flatStageTasks = stageTaskGroups.flat()
  const canAdvanceDrop = flatStageTasks.length === 0 || flatStageTasks.every(t => t.completed)
  const canMarkDropped =
    drop.status !== 'finalization' || (flatStageTasks.length > 0 && flatStageTasks.every(t => t.completed))

  function toLocalInput(d: Date | null) {
    if (!d) return ''
    const x = new Date(d)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`
  }

  return (
    <AppShell
      title={drop.name}
      actions={
        <>
          <button type="button" className="btn-ghost" onClick={() => { setEditName(drop.name); setEditType(drop.type); setEditModal(true) }}>
            ИЗМЕНИТЬ
          </button>
          <button type="button" className="btn-ghost" onClick={() => { setDateVal(toLocalInput(drop.dropDate)); setDateModal(true) }}>
            {drop.dropDate ? 'ИЗМЕНИТЬ ДАТУ' : '+ ДАТА ДРОПА'}
          </button>
          {(drop.status === 'ideation' || drop.status === 'development') && nextDropStatus && (
            <button
              type="button"
              className={`btn-outline ${btnOutlineLockedClass(!canAdvanceDrop)}`}
              disabled={pending || !canAdvanceDrop}
              title={canAdvanceDrop ? 'Перейти к следующему этапу' : 'Сначала закрой все задачи этапа у коллекции и позиций'}
              onClick={() => startTransition(async () => {
                const r = await advanceDropStageAction(drop.id)
                if (r?.error) alert(r.error)
                else router.refresh()
              })}
            >
              {pending ? 'ПЕРЕХОД...' : NEXT_DROP_LABEL[drop.status]}
            </button>
          )}
          {drop.status !== 'dropped' && (
            <button
              type="button"
              className={`btn-outline ${drop.status === 'finalization' ? btnOutlineLockedClass(!canMarkDropped) : ''}`}
              disabled={pending || (drop.status === 'finalization' && !canMarkDropped)}
              title={
                drop.status === 'finalization' && !canMarkDropped
                  ? 'Сначала закрой все задачи финального этапа'
                  : 'Отметить дроп как выпущенный'
              }
              onClick={() => startTransition(async () => {
                const r = await updateDropStatusAction(drop.id, 'dropped')
                if (r?.error) alert(r.error)
                else router.refresh()
              })}
            >
              ✓ ЗАДРОПАЛИ
            </button>
          )}
        </>
      }
    >
      <div className="mb-5">
        <DropMockupEditor dropId={drop.id} photo={drop.photo} />
      </div>

      <div className="card mb-5 p-6">
        <p className="label-caps mb-1">{DROP_TYPES[drop.type]}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          {drop.status === 'ideation' && ideationSubIdx !== null ? (
            IDEATION_SUBSTAGES.map((sub, idx) => (
              <Badge
                key={sub.key}
                label={sub.label}
                color={ideationSubIdx === idx ? STAGE_ACTIVE_COLOR : STAGE_UPCOMING_COLOR}
                small
              />
            ))
          ) : (
            <Badge label={status.label} color={status.color} small />
          )}
          {drop.dropDate && (
            <span className="text-[13px] text-[#C8C8C8]">{formatDropDate(drop.dropDate)}</span>
          )}
          {countdown && (
            <span className="text-xs font-semibold" style={{ color: countdown.color }}>
              ◷ {countdown.label}
            </span>
          )}
        </div>
        <div className="mt-5 flex gap-2">
          {STAGES.map((s, i) => {
            const { done, active } = getDropStageBarState(drop.status, i)
            return (
              <div key={s.key} className="min-w-0 flex-1">
                <div
                  className="mb-1.5 h-1"
                  style={{
                    backgroundColor: active ? STAGE_ACTIVE_COLOR : done ? STAGE_DONE_COLOR : STAGE_UPCOMING_COLOR,
                  }}
                />
                <p
                  className={`stage-rail-label ${active ? 'text-[#14C97A]' : 'text-white'}`}
                >
                  {s.short}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="drop-page-layout">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="label-caps">Позиции ({items.length})</h2>
            <button type="button" className="btn-ghost" onClick={() => setAddModal(true)}>+ ПОЗИЦИЯ</button>
          </div>
          {items.length === 0 ? (
            <div className="border border-dashed border-[#3D5248] p-10 text-center text-[13px] text-[#C8C8C8]">
              Добавь позиции в дроп
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map(item => (
                <ItemCard
                  key={item.id}
                  dropId={drop.id}
                  item={item}
                  tasks={itemTasks[item.id] ?? []}
                  onDelete={() => setDeleteItemId(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          {drop.status === 'ideation' && (
            <DropIdeationMoments dropId={drop.id} path={path} initialMoments={ideationMoments} />
          )}
          <h2 className="label-caps mb-3">Задачи дропа</h2>
          {collectionTasks.length === 0 ? (
            <p className="text-sm text-[#C8C8C8]">—</p>
          ) : (
            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="label-caps">
                  {STAGES.find(s => s.key === (drop.status === 'dropped' ? 'finalization' : drop.status))?.short} — коллекция
                </h3>
                <span className="label-caps text-[#14C97A]">
                  {collectionTasks.filter(t => t.completed).length}/{collectionTasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {collectionTasks.map(task => (
                  <TaskCheckbox
                    key={task.id}
                    task={task}
                    onToggle={() => startTransition(() => toggleTaskAction(task.id, !task.completed, path))}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={addModal} onClose={() => { setAddModal(false); setAddMode('new'); setCatalogPickId('') }} title="ДОБАВИТЬ ПОЗИЦИЮ">
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            className={`btn-ghost flex-1 ${addMode === 'new' ? 'border-[#14C97A] text-[#14C97A]' : ''}`}
            onClick={() => setAddMode('new')}
          >
            НОВАЯ
          </button>
          <button
            type="button"
            className={`btn-ghost flex-1 ${addMode === 'catalog' ? 'border-[#14C97A] text-[#14C97A]' : ''}`}
            onClick={() => setAddMode('catalog')}
          >
            ИЗ КАТАЛОГА
          </button>
        </div>
        {addMode === 'new' ? (
          <form
            onSubmit={async e => {
              e.preventDefault()
              await createItemAction(drop.id, itemName)
              setAddModal(false)
              setItemName('')
              router.refresh()
            }}
            className="flex flex-col gap-3.5"
          >
            <div>
              <label className="label-caps mb-1.5 block">Название позиции</label>
              <input
                placeholder="Например: OVERSIZED HOODIE BLACK"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn-outline w-full" disabled={!itemName.trim()}>
              ДОБАВИТЬ
            </button>
          </form>
        ) : catalogProducts.length === 0 ? (
          <p className="text-sm text-[#C8C8C8]">Нет свободных продуктов. Создайте в разделе «Продукты».</p>
        ) : (
          <form
            onSubmit={async e => {
              e.preventDefault()
              const res = await attachExistingProductAction(drop.id, catalogPickId)
              if (res?.error) alert(res.error)
              setAddModal(false)
              setCatalogPickId('')
              router.refresh()
            }}
            className="flex flex-col gap-3.5"
          >
            <div>
              <label className="label-caps mb-1.5 block">Продукт</label>
              <select value={catalogPickId} onChange={e => setCatalogPickId(e.target.value)}>
                <option value="">Выберите продукт</option>
                {catalogProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-outline w-full" disabled={!catalogPickId}>
              ПРИВЯЗАТЬ
            </button>
          </form>
        )}
      </Modal>

      <Modal open={dateModal} onClose={() => setDateModal(false)} title="ДАТА ДРОПА">
        <form
          onSubmit={async e => {
            e.preventDefault()
            await updateDropDateAction(drop.id, dateVal || null)
            setDateModal(false)
            router.refresh()
          }}
          className="flex flex-col gap-3.5"
        >
          <input type="datetime-local" value={dateVal} onChange={e => setDateVal(e.target.value)} />
          <div className="flex gap-2">
            <button type="submit" className="btn-outline flex-1">СОХРАНИТЬ</button>
            {drop.dropDate && (
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={async () => {
                  await updateDropDateAction(drop.id, null)
                  setDateModal(false)
                  router.refresh()
                }}
              >
                УБРАТЬ
              </button>
            )}
          </div>
        </form>
      </Modal>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="РЕДАКТИРОВАТЬ ДРОП">
        <form
          onSubmit={async e => {
            e.preventDefault()
            await updateDropInfoAction(drop.id, editName, editType)
            setEditModal(false)
            router.refresh()
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className="label-caps mb-1.5 block">Название</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label-caps mb-1.5 block">Тип</label>
            <select value={editType} onChange={e => setEditType(e.target.value)}>
              <option value="collection">Коллекция / Капсула</option>
              <option value="single">Единичный дроп</option>
            </select>
          </div>
          <button type="submit" className="btn-outline w-full" disabled={!editName.trim()}>СОХРАНИТЬ</button>
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={async () => {
              if (!confirm('Удалить дроп? Это действие нельзя отменить.')) return
              await deleteDropAction(drop.id)
            }}
          >
            УДАЛИТЬ ДРОП
          </button>
        </form>
      </Modal>

      <Modal open={deleteItemId !== null} onClose={() => setDeleteItemId(null)} title="УБРАТЬ ИЗ ДРОПА?">
        <p className="mb-4 text-sm text-[#C8C8C8]">
          Позиция отвяжется от дропа. Продукт останется в каталоге с задачами и заметками.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn-outline flex-1"
            onClick={async () => {
              if (deleteItemId) await deleteItemAction(drop.id, deleteItemId)
              setDeleteItemId(null)
              router.refresh()
            }}
          >
            УБРАТЬ
          </button>
          <button type="button" className="btn-ghost flex-1" onClick={() => setDeleteItemId(null)}>ОТМЕНА</button>
        </div>
      </Modal>
    </AppShell>
  )
}
