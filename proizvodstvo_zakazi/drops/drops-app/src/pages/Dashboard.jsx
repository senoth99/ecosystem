import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { fetchDrops, createDrop, deleteDrop, pb } from '../lib/pocketbase'
import { STATUS_CONFIG, DROP_TYPES, STAGES } from '../lib/constants'
import { getDropStageBarState } from '../lib/stageUtils'
import { colors, btnOutline, btnGhost, labelCaps } from '../lib/theme'

const STAGE_DONE_COLOR = '#0E9A56'
const STAGE_ACTIVE_COLOR = '#14C97A'
const STAGE_UPCOMING_COLOR = '#3A5248'

function formatCountdown(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  if (diff < 0) return { label: 'ДРОП БЫЛ', color: colors.accent }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return { label: `${days}д ${hours}ч`, color: colors.orange }
  if (hours > 0) return { label: `${hours}ч`, color: colors.warn }
  return { label: 'СЕГОДНЯ', color: colors.accent }
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function KpiCard({ label, value }) {
  return (
    <div className="kpi-card">
      <p className="label-caps">{label}</p>
      <p style={{ fontSize: '28px', fontWeight: 600, color: colors.text, marginTop: '8px' }}>{value ?? '—'}</p>
    </div>
  )
}

function DropCard({ drop, itemCount, tasksDone, tasksTotal, onClick, onDelete }) {
  const status = STATUS_CONFIG[drop.status] || STATUS_CONFIG.ideation
  const countdown = formatCountdown(drop.drop_date)
  const progress = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0

  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      style={{ padding: '20px', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
        <div style={{ minWidth: 0 }}>
          <p className="label-caps" style={{ marginBottom: '4px' }}>{DROP_TYPES[drop.type]}</p>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{drop.name}</h3>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Badge label={status.label} color={status.color} small />
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="icon-btn-hit"
            style={{ background: 'none', border: 'none', color: colors.text, cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}
            aria-label="Удалить дроп"
          >×</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <Stat label="Позиций" value={itemCount} />
        <Stat label="Задач" value={`${tasksDone}/${tasksTotal}`} />
        {drop.drop_date && <Stat label="Дата дропа" value={formatDate(drop.drop_date)} />}
        {countdown && (
          <span style={{ padding: '2px 8px', border: `1px solid ${countdown.color}40`, fontSize: '11px', color: countdown.color, fontWeight: 600 }}>{countdown.label}</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        {STAGES.map((s, i) => {
          const { done, active } = getDropStageBarState(drop.status, i)
          return (
            <div key={s.key} style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  height: '3px',
                  background: active ? STAGE_ACTIVE_COLOR : done ? STAGE_DONE_COLOR : STAGE_UPCOMING_COLOR,
                }}
              />
              <p className="label-caps stage-rail-label" style={{ marginTop: '4px', color: active ? STAGE_ACTIVE_COLOR : colors.text }}>{s.short}</p>
            </div>
          )
        })}
      </div>
      {tasksTotal > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="label-caps">Прогресс</span>
            <span className="label-caps" style={{ color: colors.accent }}>{progress}%</span>
          </div>
          <div style={{ height: '2px', background: colors.border }}>
            <div style={{ height: '100%', width: `${progress}%`, background: colors.accent }} />
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="label-caps">{label}</p>
      <p style={{ fontSize: '14px', fontWeight: 500, color: colors.text }}>{value}</p>
    </div>
  )
}

function DropsChart({ drops }) {
  const bars = useMemo(() => {
    const byStage = [0, 0, 0]
    drops.forEach(d => {
      const idx = { ideation: 0, development: 1, finalization: 2, dropped: 2 }[d.status] ?? 0
      byStage[idx] += 1
    })
    const max = Math.max(...byStage, 1)
    return STAGES.map((s, i) => ({ label: s.short, pct: Math.round((byStage[i] / max) * 100), count: byStage[i] }))
  }, [drops])

  return (
    <div style={{ marginTop: '24px', padding: '16px', border: `1px solid ${colors.border}`, background: colors.card }}>
      <p className="label-caps" style={{ marginBottom: '12px' }}>Дропы по этапам</p>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '100px' }}>
        {bars.map(b => (
          <div key={b.label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: `${Math.max(b.pct, 8)}%`, minHeight: '8px', background: b.count ? colors.accent : colors.border, marginBottom: '8px' }} />
            <span className="label-caps chart-axis-label">{b.label}</span>
            <p style={{ fontSize: '12px', color: colors.text, fontWeight: 600 }}>{b.count}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [drops, setDrops] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'collection', drop_date: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  const [listError, setListError] = useState(null)
  const loadSeq = useRef(0)

  useEffect(() => {
    loadDrops()
    let active = true
    const subs = []
    const sub = (col, cb) => pb.collection(col).subscribe('*', cb).then(fn => { if (active) subs.push(fn); else fn() })
    sub('drops', loadDrops)
    sub('tasks', loadStats)
    sub('items', loadStats)
    return () => { active = false; subs.forEach(fn => fn()) }
  }, [])

  async function loadDrops() {
    const seq = ++loadSeq.current
    const { data, error } = await fetchDrops()
    if (seq !== loadSeq.current) return
    if (error) {
      let msg = error.message || 'Не удалось загрузить дропы'
      if (/something went wrong/i.test(msg)) {
        msg = 'Ошибка запроса к PocketBase. Проверь, что сервер запущен и схема коллекций совпадает с миграциями.'
      }
      setListError(msg)
      setLoading(false)
      return
    }
    setListError(null)
    const list = Array.isArray(data) ? data : []
    setDrops(list)
    if (list.length) {
      try {
        await loadStatsFor(list)
      } catch {
        // не сбрасываем список дропов из‑за ошибки в статистике
      }
    } else {
      setStats({})
    }
    setLoading(false)
  }

  async function loadStats() {
    const { data, error } = await fetchDrops()
    if (error || !data?.length) return
    try {
      await loadStatsFor(data)
    } catch {
      /* ignore */
    }
  }

  async function loadStatsFor(dropsData) {
    const results = {}
    await Promise.all(dropsData.map(async drop => {
      const items = await pb.collection('items').getFullList({ filter: `drop_id = "${drop.id}"`, fields: 'id' }).catch(() => [])
      const dropTasks = await pb.collection('tasks').getFullList({ filter: `scope = "drop" && scope_id = "${drop.id}"`, fields: 'completed' }).catch(() => [])
      let itemTasksDone = 0, itemTasksTotal = 0
      if (items.length) {
        const filter = items.map(i => `scope_id = "${i.id}"`).join(' || ')
        const it = await pb.collection('tasks').getFullList({ filter: `scope = "item" && (${filter})`, fields: 'completed' }).catch(() => [])
        itemTasksDone = it.filter(t => t.completed).length
        itemTasksTotal = it.length
      }
      results[drop.id] = { itemCount: items.length, tasksDone: dropTasks.filter(t => t.completed).length + itemTasksDone, tasksTotal: dropTasks.length + itemTasksTotal }
    }))
    setStats(results)
  }

  const totals = useMemo(() => {
    let items = 0, done = 0, total = 0, active = 0
    drops.forEach(d => {
      if (d.status !== 'dropped') active++
      const s = stats[d.id]
      if (s) { items += s.itemCount; done += s.tasksDone; total += s.tasksTotal }
    })
    return { drops: drops.length, active, items, done, pending: total - done }
  }, [drops, stats])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    setCreateError(null)
    const dropDate = form.drop_date ? new Date(form.drop_date).toISOString() : null
    const { data, error } = await createDrop(form.name.trim(), form.type, dropDate)
    setCreating(false)
    if (error) {
      let msg = error.message || 'Ошибка'
      if (/something went wrong/i.test(msg)) {
        msg = 'Нет связи с сервером данных. Запусти PocketBase (или проверь VITE_PB_URL).'
      }
      setCreateError(msg)
      return
    }
    if (data) { setModal(false); setForm({ name: '', type: 'collection', drop_date: '' }); navigate(`/drops/${data.id}`) }
  }

  async function handleDelete(dropId) {
    if (!confirm('Удалить дроп?')) return
    const { error } = await deleteDrop(dropId)
    if (error) { alert(error.message || 'Ошибка удаления'); return }
    loadDrops()
  }

  const sorted = [...drops].sort((a, b) => {
    const order = { ideation: 0, development: 1, finalization: 2, dropped: 3 }
    return (order[a.status] ?? 4) - (order[b.status] ?? 4)
  })

  return (
    <AppShell
      title="ДРОПЫ"
      actions={
        <button type="button" onClick={() => setModal(true)} style={btnOutline}>
          + НОВЫЙ ДРОП
        </button>
      }
    >
      <p className="label-caps" style={{ marginBottom: '16px' }}>Ключевые показатели</p>
      <div className="dashboard-kpi-grid">
        <KpiCard label="Всего дропов" value={totals.drops} />
        <KpiCard label="Активных" value={totals.active} />
        <KpiCard label="Позиций" value={totals.items} />
        <KpiCard label="Задач выполнено" value={totals.done} />
        <KpiCard label="Задач осталось" value={totals.pending} />
      </div>

      {listError && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', border: `1px solid ${colors.error}`, color: colors.error, fontSize: '13px' }}>
          <p style={{ margin: 0 }}>{listError}</p>
          <button type="button" onClick={() => { setLoading(true); loadDrops() }} style={{ ...btnGhost, marginTop: '10px' }}>
            ПОВТОРИТЬ
          </button>
        </div>
      )}

      <DropsChart drops={drops} />

      <p className="label-caps" style={{ margin: '32px 0 16px' }}>Все дропы</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : listError && drops.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: colors.muted }}>
          <p style={{ fontSize: '14px' }}>Данные не загрузились.</p>
        </div>
      ) : drops.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: colors.muted }}>
          <p style={{ fontSize: '14px' }}>Нет дропов. Создай первый.</p>
        </div>
      ) : (
        <div className="dashboard-drops-grid">
          {sorted.map(drop => {
            const s = stats[drop.id] || { itemCount: 0, tasksDone: 0, tasksTotal: 0 }
            return (
              <DropCard
                key={drop.id}
                drop={drop}
                itemCount={s.itemCount}
                tasksDone={s.tasksDone}
                tasksTotal={s.tasksTotal}
                onClick={() => navigate(`/drops/${drop.id}`)}
                onDelete={() => handleDelete(drop.id)}
              />
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="НОВЫЙ ДРОП">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={formLabel}>Название дропа</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus placeholder="SHADOW CAPSULE SS25" />
          </div>
          <div>
            <label style={formLabel}>Тип</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              <option value="collection">Коллекция / Капсула</option>
              <option value="single">Единичный дроп</option>
            </select>
          </div>
          <div>
            <label style={formLabel}>Дата дропа (необязательно)</label>
            <input type="datetime-local" value={form.drop_date} onChange={e => setForm(p => ({ ...p, drop_date: e.target.value }))} />
          </div>
          {createError && <p style={{ color: colors.error, fontSize: '12px' }}>{createError}</p>}
          <button type="submit" disabled={creating || !form.name.trim()} style={{ ...btnOutline, cursor: creating || !form.name.trim() ? 'not-allowed' : 'pointer' }}>
            {creating ? 'СОЗДАНИЕ...' : 'СОЗДАТЬ'}
          </button>
        </form>
      </Modal>
    </AppShell>
  )
}

const formLabel = { ...labelCaps, display: 'block', marginBottom: '6px' }
