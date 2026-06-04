import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import {
  fetchDrop, fetchItems, fetchTasksForStage,
  createItem, deleteItem, toggleTask, updateDropDate, updateDropStatus,
  advanceDropStage,
  fetchMoments, upsertMoment,
  pb
} from '../lib/pocketbase'
import { STATUS_CONFIG, STAGES, STAGE_INDEX, DROP_TYPES, IDEATION_SUBSTAGES, MOMENTS_DROP } from '../lib/constants'
import { getDropStageBarState, getItemStageBarState, getIdeationSubstageIndex } from '../lib/stageUtils'
import { colors, btnOutline, btnGhost, labelCaps, btnOutlineLockedStyle } from '../lib/theme'
import ItemMeta from '../components/item/ItemMeta'

const NEXT_DROP_STATUS = { ideation: 'development', development: 'finalization' }

const STAGE_DONE_COLOR = '#0E9A56'
const STAGE_ACTIVE_COLOR = '#14C97A'
const STAGE_UPCOMING_COLOR = '#3A5248'

const dropMomentTextarea = {
  width: '100%',
  padding: '10px 12px',
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  color: colors.text,
  fontSize: '13px',
  lineHeight: 1.5,
  resize: 'vertical',
  minHeight: '80px',
}

const momentFormLabel = { ...labelCaps, display: 'block', marginBottom: '6px' }

function toLocalDatetimeInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalDatetimeInput(local) {
  if (!local) return null
  return new Date(local).toISOString()
}

function formatDate(str) {
  if (!str) return null
  return new Date(str).toLocaleDateString('ru-RU', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatCountdown(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  if (diff < 0) {
    const days = Math.floor(Math.abs(diff) / 86400000)
    return `${days > 0 ? days + 'д ' : ''}назад`
  }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `${days}д ${hours}ч до дропа`
  if (hours > 0) return `${hours}ч ${mins}м до дропа`
  return `${mins}м до дропа`
}

function TaskCheckbox({ task, onToggle }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => e.key === 'Enter' && onToggle()}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        cursor: 'pointer', padding: '8px',
        background: task.completed ? colors.card : colors.bg,
        border: `1px solid ${task.completed ? colors.accentBright : colors.bg}`,
      }}
    >
      <div style={{
        width: '16px', height: '16px', flexShrink: 0, marginTop: '1px',
        border: `2px solid ${task.completed ? colors.accent : colors.mutedDark}`,
        background: task.completed ? colors.accent : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {task.completed && <span style={{ color: colors.bg, fontSize: '10px', fontWeight: 700 }}>✓</span>}
      </div>
      <span style={{
        fontSize: '13px',
        color: task.completed ? colors.muted : colors.text,
        textDecoration: task.completed ? 'line-through' : 'none',
        lineHeight: 1.4,
      }}>{task.title}</span>
    </div>
  )
}

function ItemCard({ item, tasks, onClick, onDelete }) {
  const done = tasks.filter(t => t.completed).length
  const total = tasks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const stageInfo = STAGES[STAGE_INDEX[item.stage]]

  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}
    >
      <ItemMeta item={item} compact />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '15px', fontWeight: 500, color: colors.text }}>{item.name}</span>
          <span style={{
            fontSize: '10px', color: colors.accent,
            background: colors.card,
            border: `1px solid ${colors.accent}`,
            padding: '1px 6px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>{stageInfo?.short}</span>
          {item.sample_printed && (
            <span style={{
              fontSize: '10px', color: colors.accentBright,
              border: `1px solid ${colors.accentBright}`,
              padding: '1px 6px', letterSpacing: '0.1em',
            }}>СЕМПЛ</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {STAGES.map((s, i) => {
            const { done: stDone, active } = getItemStageBarState(item.stage, i)
            return (
              <div key={s.key} style={{
                height: '2px', flex: 1,
                background: active ? STAGE_ACTIVE_COLOR : stDone ? STAGE_DONE_COLOR : STAGE_UPCOMING_COLOR,
              }} />
            )
          })}
        </div>
        {total > 0 && (
          <p className="label-caps" style={{ marginTop: '6px', fontSize: '10px' }}>
            Задачи: {done}/{total} ({pct}%)
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="icon-btn-hit"
        style={{ background: 'none', border: 'none', color: colors.text, cursor: 'pointer', fontSize: '22px', lineHeight: 1, marginInlineStart: 'auto', flexShrink: 0 }}
        aria-label="Удалить позицию"
      >×</button>
    </div>
  )
}

function CollectionTasks({ dropId, stage, visible }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!visible) return
    load()
    let active = true
    let unsubFn = null
    pb.collection('tasks').subscribe(`scope = "drop" && scope_id = "${dropId}"`, load).then(fn => {
      if (active) unsubFn = fn
      else fn()
    })
    return () => { active = false; unsubFn?.() }
  }, [dropId, stage, visible])

  async function load() {
    const { data } = await fetchTasksForStage('drop', dropId, stage)
    if (data) setTasks(data)
    setLoading(false)
  }

  async function handleToggle(task) {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))
    const { error } = await toggleTask(task.id, !task.completed)
    if (error) load()
  }

  if (!visible || loading || !tasks.length) return null

  const done = tasks.filter(t => t.completed).length

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 className="label-caps">{STAGES[STAGE_INDEX[stage]]?.short} — коллекция</h3>
        <span className="label-caps" style={{ color: colors.accent }}>{done}/{tasks.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {tasks.map(task => (
          <TaskCheckbox key={task.id} task={task} onToggle={() => handleToggle(task)} />
        ))}
      </div>
    </div>
  )
}

function DropIdeationMoments({ dropId }) {
  const [moments, setMoments] = useState({})
  const [modalOpen, setModalOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [stepDraft, setStepDraft] = useState('')
  const momentsRef = useRef({})
  momentsRef.current = moments
  const defs = MOMENTS_DROP.ideation

  const answeredDefs = defs.filter(({ key }) => (moments[key] ?? '').trim() !== '')

  useEffect(() => {
    let cancel = false
    let unsub = null

    async function load() {
      const { data } = await fetchMoments(dropId, 'ideation', 'drop')
      if (cancel || !data) return
      const map = {}
      data.forEach(m => { map[m.key] = m.value || '' })
      setMoments(map)
    }

    load()
    let active = true
    pb.collection('moments').subscribe(`scope = "drop" && scope_id = "${dropId}"`, () => {
      if (!cancel) load()
    }).then(fn => {
      if (active) unsub = fn
      else fn()
    })

    return () => {
      cancel = true
      active = false
      unsub?.()
    }
  }, [dropId])

  useEffect(() => {
    if (!modalOpen || !defs[step]) return
    const k = defs[step].key
    setStepDraft(momentsRef.current[k] ?? '')
  }, [modalOpen, step, defs])

  function openModal() {
    const firstEmpty = defs.findIndex(({ key }) => !(moments[key]?.trim()))
    setStep(firstEmpty === -1 ? 0 : firstEmpty)
    setModalOpen(true)
  }

  async function persistCurrent() {
    const d = defs[step]
    if (!d) return
    const val = stepDraft.trim()
    const { error } = await upsertMoment(dropId, 'ideation', d.key, val, 'drop')
    if (!error) {
      setMoments(prev => ({ ...prev, [d.key]: val }))
    }
  }

  async function handleCloseModal() {
    await persistCurrent()
    setModalOpen(false)
  }

  async function handleNext() {
    await persistCurrent()
    if (step < defs.length - 1) {
      setStep(s => s + 1)
    } else {
      setModalOpen(false)
    }
  }

  async function handleBack() {
    await persistCurrent()
    if (step > 0) setStep(s => s - 1)
  }

  if (!defs.length) return null

  const cur = defs[step]
  const progressLabel = cur ? `${step + 1} / ${defs.length}` : ''

  return (
    <>
      <div className="card" style={{ padding: '20px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: answeredDefs.length ? '16px' : 0 }}>
          <h3 className="label-caps" style={{ margin: 0 }}>Моменты коллекции (создание)</h3>
          <button type="button" onClick={openModal} style={btnOutline}>
            {answeredDefs.length ? 'ИЗМЕНИТЬ' : 'ЗАПОЛНИТЬ'}
          </button>
        </div>
        {answeredDefs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {answeredDefs.map(({ key, label }) => (
              <div key={key}>
                <p className="label-caps" style={{ marginBottom: '6px' }}>{label}</p>
                <p style={{ fontSize: '13px', color: colors.text, lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>{moments[key]}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={handleCloseModal} title={`МОМЕНТЫ КОЛЛЕКЦИИ · ${progressLabel}`} maxWidth="560px">
        {cur && (
          <>
            <p style={{ ...momentFormLabel, marginBottom: '10px' }}>Вопрос</p>
            <p style={{ fontSize: '14px', color: colors.text, marginBottom: '16px', lineHeight: 1.45 }}>{cur.label}</p>
            <label style={{ ...momentFormLabel, marginBottom: '6px' }}>Ответ</label>
            <textarea
              value={stepDraft}
              onChange={e => setStepDraft(e.target.value)}
              style={{ ...dropMomentTextarea, minHeight: '120px' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <button type="button" disabled={step === 0} onClick={handleBack} style={{ ...btnGhost, opacity: step === 0 ? 0.4 : 1, cursor: step === 0 ? 'not-allowed' : 'pointer' }}>
                НАЗАД
              </button>
              <button type="button" onClick={handleNext} style={btnOutline}>
                {step >= defs.length - 1 ? 'ГОТОВО' : 'ДАЛЕЕ'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}

export default function DropPage() {
  const { dropId } = useParams()
  const navigate = useNavigate()
  const [drop, setDrop] = useState(null)
  const [items, setItems] = useState([])
  const [itemTasks, setItemTasks] = useState({})
  const [loading, setLoading] = useState(true)
  const [addModal, setAddModal] = useState(false)
  const [dateModal, setDateModal] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newDate, setNewDate] = useState('')
  const [adding, setAdding] = useState(false)
  const [dropIdeationTasks, setDropIdeationTasks] = useState([])
  const [canAdvanceDrop, setCanAdvanceDrop] = useState(false)
  const [canMarkDropped, setCanMarkDropped] = useState(false)

  useEffect(() => {
    setDrop(null)
    setItems([])
    setItemTasks({})
    setDropIdeationTasks([])
    setCanAdvanceDrop(false)
    setCanMarkDropped(false)
    setLoading(true)
    load()
    let active = true
    const subs = []
    const sub = (col, filter, cb) => pb.collection(col).subscribe(filter, cb).then(fn => {
      if (active) subs.push(fn)
      else fn()
    })
    sub('drops', dropId, load)
    sub('items', `drop_id = "${dropId}"`, load)
    sub('tasks', '*', load)
    return () => { active = false; subs.forEach(fn => fn()) }
  }, [dropId])

  async function load() {
    const [{ data: d }, { data: i }] = await Promise.all([
      fetchDrop(dropId),
      fetchItems(dropId),
    ])
    if (!d) setDrop(null)
    else setDrop(d)
    const itemsList = i ?? []
    setItems(itemsList)

    const stageForDrop = d && d.status !== 'dropped' ? d.status : null
    let dropStageTaskRows = []
    if (stageForDrop) {
      dropStageTaskRows = await pb.collection('tasks').getFullList({
        filter: `scope = "drop" && scope_id = "${dropId}" && stage = "${stageForDrop}"`,
        fields: 'title,completed',
      }).catch(() => [])
    }
    setDropIdeationTasks(dropStageTaskRows)

    let advanceOk = false
    let droppedOk = false
    if (d) {
      if (d.status === 'ideation' || d.status === 'development') {
        const st = d.status
        const itemLists = await Promise.all(itemsList.map(item =>
          pb.collection('tasks').getFullList({
            filter: `scope = "item" && scope_id = "${item.id}" && stage = "${st}"`,
            fields: 'completed',
          }).catch(() => [])
        ))
        const all = [...dropStageTaskRows, ...itemLists.flat()]
        advanceOk = all.length === 0 || all.every(t => t.completed)
      }
      if (d.status === 'finalization') {
        const itemLists = await Promise.all(itemsList.map(item =>
          pb.collection('tasks').getFullList({
            filter: `scope = "item" && scope_id = "${item.id}" && stage = "finalization"`,
            fields: 'completed',
          }).catch(() => [])
        ))
        const all = [...dropStageTaskRows, ...itemLists.flat()]
        droppedOk = all.length === 0 || all.every(t => t.completed)
      }
    }
    setCanAdvanceDrop(advanceOk)
    setCanMarkDropped(droppedOk)

    if (itemsList.length > 0) await loadItemTasks(itemsList)
    else setItemTasks({})
    setLoading(false)
  }

  async function loadItemTasks(itemsList) {
    const results = {}
    await Promise.all(itemsList.map(async item => {
      const data = await pb.collection('tasks').getFullList({
        filter: `scope = "item" && scope_id = "${item.id}" && stage = "${item.stage}"`,
        fields: 'title,completed',
      }).catch(() => [])
      results[item.id] = data
    }))
    setItemTasks(results)
  }

  async function handleAddItem(e) {
    e.preventDefault()
    if (!newItemName.trim()) return
    setAdding(true)
    const { error } = await createItem(dropId, newItemName.trim())
    setAdding(false)
    if (!error) {
      setAddModal(false)
      setNewItemName('')
      load()
    }
  }

  async function handleDeleteItem(itemId) {
    if (!confirm('Удалить позицию?')) return
    const { error } = await deleteItem(itemId)
    if (error) alert(error.message)
    else load()
  }

  async function handleUpdateDate(e) {
    e.preventDefault()
    await updateDropDate(dropId, fromLocalDatetimeInput(newDate))
    setDateModal(false)
  }

  async function handleMarkDropped() {
    if (!confirm('Отметить дроп как выпущенный?')) return
    const { error } = await updateDropStatus(dropId, 'dropped')
    if (error) alert(error.message)
    else load()
  }

  async function handleAdvanceDrop() {
    const next = NEXT_DROP_STATUS[drop?.status]
    if (!next) return
    const { error } = await advanceDropStage(dropId, next)
    if (error) alert(error.message)
    else load()
  }

  if (loading) {
    return (
      <AppShell title="...">
        <div style={{ textAlign: 'center', padding: '80px' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      </AppShell>
    )
  }

  if (!drop) {
    return (
      <AppShell title="НЕ НАЙДЕН">
        <p style={{ color: colors.muted, textAlign: 'center', padding: '40px' }}>Дроп не найден</p>
      </AppShell>
    )
  }

  const status = STATUS_CONFIG[drop.status] || STATUS_CONFIG.ideation
  const countdown = formatCountdown(drop.drop_date)
  const taskStage = drop.status === 'dropped' ? 'finalization' : drop.status
  const ideationSubIdx = getIdeationSubstageIndex(drop.status, items, itemTasks, dropIdeationTasks)

  return (
    <AppShell
      title={drop.name}
      tabs={[
        { label: 'ДРОПЫ', href: '/', active: false },
        { label: drop.name.toUpperCase(), href: `/drops/${dropId}`, active: true },
      ]}
      actions={
        <>
          <button type="button" onClick={() => { setNewDate(toLocalDatetimeInput(drop.drop_date)); setDateModal(true) }} style={btnGhost}>
            {drop.drop_date ? 'ИЗМЕНИТЬ ДАТУ' : '+ ДАТА ДРОПА'}
          </button>
          {(drop.status === 'ideation' || drop.status === 'development') && (
            <button
              type="button"
              onClick={handleAdvanceDrop}
              disabled={!canAdvanceDrop}
              title={canAdvanceDrop ? 'Перейти к следующему этапу' : 'Сначала закрой все задачи этапа у коллекции и позиций'}
              style={{ ...btnOutline, ...btnOutlineLockedStyle(!canAdvanceDrop) }}
            >
              {drop.status === 'ideation' ? '→ ПРОРАБОТКА' : '→ ФИНАЛ'}
            </button>
          )}
          {drop.status !== 'dropped' && (
            <button
              type="button"
              onClick={handleMarkDropped}
              disabled={drop.status === 'finalization' && !canMarkDropped}
              title={
                drop.status === 'finalization' && !canMarkDropped
                  ? 'Сначала закрой все задачи финального этапа'
                  : 'Отметить дроп как выпущенный'
              }
              style={{
                ...btnOutline,
                ...(drop.status === 'finalization' ? btnOutlineLockedStyle(!canMarkDropped) : {}),
              }}
            >
              ✓ ЗАДРОПАЛИ
            </button>
          )}
        </>
      }
    >
      <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <p className="label-caps" style={{ marginBottom: '4px' }}>{DROP_TYPES[drop.type]}</p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
          {drop.status === 'ideation' ? (
            IDEATION_SUBSTAGES.map((sub, idx) => (
              <Badge
                key={sub.key}
                label={sub.label}
                color={ideationSubIdx === idx ? STAGE_ACTIVE_COLOR : STAGE_UPCOMING_COLOR}
                small
              />
            ))
          ) : (
            <Badge label={status.label} color={status.color} />
          )}
          {drop.drop_date && <span style={{ fontSize: '13px', color: colors.muted }}>{formatDate(drop.drop_date)}</span>}
          {countdown && <span style={{ fontSize: '12px', color: colors.orange, fontWeight: 600 }}>◷ {countdown}</span>}
        </div>
        <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
          {STAGES.map((s, i) => {
            const { done, active } = getDropStageBarState(drop.status, i)
            return (
              <div key={s.key} style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  height: '4px',
                  background: active ? STAGE_ACTIVE_COLOR : done ? STAGE_DONE_COLOR : STAGE_UPCOMING_COLOR,
                  marginBottom: '6px',
                }} />
                <p
                  className="label-caps stage-rail-label"
                  style={{ color: active ? STAGE_ACTIVE_COLOR : colors.text }}
                >{s.short}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="drop-page-layout">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 className="label-caps">Позиции ({items.length})</h2>
            <button type="button" onClick={() => setAddModal(true)} style={btnGhost}>+ ПОЗИЦИЯ</button>
          </div>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.muted, border: `1px dashed ${colors.border}` }}>
              <p style={{ fontSize: '13px' }}>Добавь позиции в дроп</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  tasks={itemTasks[item.id] || []}
                  onClick={() => navigate(`/drops/${dropId}/items/${item.id}`)}
                  onDelete={() => handleDeleteItem(item.id)}
                />
              ))}
            </div>
          )}
        </div>
        <div>
          {drop.status === 'ideation' && <DropIdeationMoments dropId={dropId} />}
          <h2 className="label-caps" style={{ marginBottom: '12px' }}>Задачи дропа</h2>
          {['ideation', 'development', 'finalization'].map(stage => (
            <CollectionTasks
              key={stage}
              dropId={dropId}
              stage={stage}
              visible={stage === taskStage}
            />
          ))}
        </div>
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="НОВАЯ ПОЗИЦИЯ">
        <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={formLabel}>Название позиции</label>
            <input
              placeholder="Например: OVERSIZED HOODIE BLACK"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" disabled={adding || !newItemName.trim()} style={{ ...btnOutline, cursor: adding || !newItemName.trim() ? 'not-allowed' : 'pointer' }}>
            {adding ? 'ДОБАВЛЕНИЕ...' : 'ДОБАВИТЬ'}
          </button>
        </form>
      </Modal>

      <Modal open={dateModal} onClose={() => setDateModal(false)} title="ДАТА ДРОПА">
        <form onSubmit={handleUpdateDate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" style={{ ...btnOutline, flex: 1 }}>СОХРАНИТЬ</button>
            {drop.drop_date && (
              <button type="button" onClick={async () => { await updateDropDate(dropId, null); setDateModal(false) }} style={{ ...btnGhost, flex: 1 }}>
                УБРАТЬ
              </button>
            )}
          </div>
        </form>
      </Modal>
    </AppShell>
  )
}

const formLabel = { ...labelCaps, display: 'block', marginBottom: '6px' }
