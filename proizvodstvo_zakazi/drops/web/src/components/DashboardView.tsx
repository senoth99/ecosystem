'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from './AppShell'
import Badge from './Badge'
import Modal from './Modal'
import { STAGES, STATUS_CONFIG, DROP_TYPES } from '@/lib/constants'
import { getDropStageBarState, formatCountdown } from '@/lib/stageUtils'
import { STAGE_ACTIVE_COLOR, STAGE_DONE_COLOR, STAGE_UPCOMING_COLOR, colors } from '@/lib/theme'
import { createDropAction, deleteDropAction } from '@/app/actions'
import { DropMockupThumb } from './DropMockup'

type Drop = {
  id: string
  name: string
  type: string
  dropDate: Date | null
  status: string
  photo: string | null
  createdAt: Date
}

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="kpi-card">
      <p className="label-caps">{label}</p>
      <p className="mt-2 text-[28px] font-semibold text-white">{value ?? '—'}</p>
    </div>
  )
}

function DropsChart({ drops }: { drops: Drop[] }) {
  const bars = useMemo(() => {
    const byStage = [0, 0, 0]
    drops.forEach(d => {
      const idx = { ideation: 0, development: 1, finalization: 2, dropped: 2 }[d.status] ?? 0
      byStage[idx] += 1
    })
    const max = Math.max(...byStage, 1)
    return STAGES.map((s, i) => ({
      label: s.short,
      pct: Math.round((byStage[i] / max) * 100),
      count: byStage[i],
    }))
  }, [drops])

  return (
    <div className="card mt-6 p-4">
      <p className="label-caps mb-3">Дропы по этапам</p>
      <div className="flex h-[100px] items-end gap-3">
        {bars.map(b => (
          <div key={b.label} className="flex-1 text-center">
            <div
              className="mb-2 min-h-[8px]"
              style={{
                height: `${Math.max(b.pct, 8)}%`,
                background: b.count ? colors.accent : colors.border,
              }}
            />
            <span className="stage-rail-label label-caps">{b.label}</span>
            <p className="text-xs font-semibold text-white">{b.count}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DropRow({
  drop,
  itemCount,
  tasksDone,
  tasksTotal,
  onDelete,
}: {
  drop: Drop
  itemCount: number
  tasksDone: number
  tasksTotal: number
  onDelete: () => void
}) {
  const status = STATUS_CONFIG[drop.status] ?? STATUS_CONFIG.ideation
  const countdown = formatCountdown(drop.dropDate)
  const progress = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0

  return (
    <Link href={`/drops/${drop.id}`} className="drop-row card">
      <DropMockupThumb dropId={drop.id} photo={drop.photo} size={88} />
      <div className="drop-row__body min-w-0 flex-1">
        <div className="drop-row__head">
          <div className="min-w-0">
            <p className="label-caps mb-0.5">{DROP_TYPES[drop.type]}</p>
            <h3 className="truncate text-[16px] font-semibold text-white">{drop.name}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge label={status.label} color={status.color} small />
            {countdown && (
              <span
                className="px-2 py-0.5 text-[11px] font-semibold"
                style={{ border: `1px solid ${countdown.color}40`, color: countdown.color }}
              >
                {countdown.label}
              </span>
            )}
            <button
              type="button"
              className="icon-btn-hit border-0 bg-transparent text-xl leading-none text-white"
              aria-label="Удалить дроп"
              onClick={e => { e.preventDefault(); onDelete() }}
            >
              ×
            </button>
          </div>
        </div>
        <div className="drop-row__meta">
          <span><span className="label-caps">Позиций </span><span className="text-white">{itemCount}</span></span>
          <span><span className="label-caps">Задач </span><span className="text-white">{tasksDone}/{tasksTotal}</span></span>
          {drop.dropDate && (
            <span>
              <span className="label-caps">Дата </span>
              <span className="text-white">
                {new Date(drop.dropDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </span>
          )}
          {tasksTotal > 0 && <span className="label-caps text-[#14C97A]">{progress}%</span>}
        </div>
        <div className="drop-row__stages">
          {STAGES.map((s, i) => {
            const { done, active } = getDropStageBarState(drop.status, i)
            return (
              <div key={s.key} className="drop-row__stage">
                <div
                  className="h-[3px]"
                  style={{
                    backgroundColor: active ? STAGE_ACTIVE_COLOR : done ? STAGE_DONE_COLOR : STAGE_UPCOMING_COLOR,
                  }}
                />
                <p className={`stage-rail-label label-caps mt-1 ${active ? 'text-[#14C97A]' : 'text-white'}`}>
                  {s.short}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </Link>
  )
}

export default function DashboardView({
  drops,
  stats,
  archived = false,
}: {
  drops: Drop[]
  stats: Record<string, { itemCount: number; tasksDone: number; tasksTotal: number }>
  archived?: boolean
}) {
  const router = useRouter()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'collection', dropDate: '' })
  const [creating, setCreating] = useState(false)

  const visibleDrops = drops.filter(d => (archived ? d.status === 'dropped' : d.status !== 'dropped'))

  const totals = visibleDrops.reduce(
    (acc, d) => {
      const s = stats[d.id]
      if (s) {
        acc.items += s.itemCount
        acc.done += s.tasksDone
        acc.total += s.tasksTotal
      }
      if (d.status !== 'dropped') acc.active++
      return acc
    },
    { drops: visibleDrops.length, active: 0, items: 0, done: 0, total: 0, pending: 0 },
  )
  totals.pending = totals.total - totals.done

  const sorted = [...visibleDrops].sort((a, b) => {
    const order: Record<string, number> = { ideation: 0, development: 1, finalization: 2, dropped: 3 }
    return (order[a.status] ?? 4) - (order[b.status] ?? 4)
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    const drop = await createDropAction(form.name.trim(), form.type, form.dropDate || null)
    setCreating(false)
    router.push(`/drops/${drop.id}`)
  }

  return (
    <AppShell
      title={archived ? 'АРХИВ' : 'ДРОПЫ'}
      tabs={[
        { label: 'ДРОПЫ', href: '/', active: !archived },
        { label: 'ПРОДУКТЫ', href: '/products', active: false },
        { label: 'АРХИВ', href: '/archive', active: archived },
      ]}
      actions={!archived && (
        <button type="button" className="btn-outline" onClick={() => setModal(true)}>+ НОВЫЙ ДРОП</button>
      )}
    >
      {!archived && (
        <>
          <p className="label-caps mb-4">Ключевые показатели</p>
          <div className="dashboard-kpi-grid">
            <KpiCard label="Всего дропов" value={totals.drops} />
            <KpiCard label="Активных" value={totals.active} />
            <KpiCard label="Позиций" value={totals.items} />
            <KpiCard label="Задач выполнено" value={totals.done} />
            <KpiCard label="Задач осталось" value={totals.pending} />
          </div>
          <DropsChart drops={drops.filter(d => d.status !== 'dropped')} />
        </>
      )}

      <p className={`label-caps ${archived ? 'mb-4' : 'mb-4 mt-8'}`}>{archived ? 'Архив' : 'Все дропы'}</p>
      {sorted.length === 0 ? (
        <p className="py-10 text-center text-[#C8C8C8]">
          {archived ? 'Архив пуст.' : 'Нет активных дропов. Создай первый.'}
        </p>
      ) : (
        <div className="dashboard-drops-list">
          {sorted.map(drop => {
            const s = stats[drop.id] ?? { itemCount: 0, tasksDone: 0, tasksTotal: 0 }
            return (
              <DropRow
                key={drop.id}
                drop={drop}
                itemCount={s.itemCount}
                tasksDone={s.tasksDone}
                tasksTotal={s.tasksTotal}
                onDelete={async () => {
                  if (!confirm('Удалить дроп?')) return
                  await deleteDropAction(drop.id)
                  router.refresh()
                }}
              />
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="НОВЫЙ ДРОП">
        <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
          <div>
            <label className="label-caps mb-1.5 block">Название дропа</label>
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              autoFocus
              placeholder="SHADOW CAPSULE SS25"
            />
          </div>
          <div>
            <label className="label-caps mb-1.5 block">Тип</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              <option value="collection">Коллекция / Капсула</option>
              <option value="single">Единичный дроп</option>
            </select>
          </div>
          <div>
            <label className="label-caps mb-1.5 block">Дата дропа (необязательно)</label>
            <input
              type="datetime-local"
              value={form.dropDate}
              onChange={e => setForm(p => ({ ...p, dropDate: e.target.value }))}
            />
          </div>
          <button type="submit" className="btn-outline w-full" disabled={creating || !form.name.trim()}>
            {creating ? 'СОЗДАНИЕ...' : 'СОЗДАТЬ'}
          </button>
        </form>
      </Modal>
    </AppShell>
  )
}
