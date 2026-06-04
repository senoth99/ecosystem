import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import Modal from '../components/ui/Modal'
import {
  fetchItem, fetchDrop, fetchTasksForStage,
  toggleTask, updateItemName,
  advanceItemStage, pb
} from '../lib/pocketbase'
import { STAGES, STAGE_INDEX, NEXT_STAGE } from '../lib/constants'
import { colors, btnGhost, btnOutline, labelCaps, btnOutlineLockedStyle } from '../lib/theme'
import ItemMeta from '../components/item/ItemMeta'

const formLabel = { ...labelCaps, display: 'block', marginBottom: '6px' }

function TaskItem({ task, onToggle }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => e.key === 'Enter' && onToggle()}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        cursor: 'pointer', padding: '8px 10px',
        background: task.completed ? colors.card : colors.bg,
        border: `1px solid ${task.completed ? colors.accentBright : colors.bg}`,
      }}
    >
      <div
        style={{
          width: '17px', height: '17px', flexShrink: 0, marginTop: '1px',
          border: `2px solid ${task.completed ? colors.accent : colors.mutedDark}`,
          background: task.completed ? colors.accent : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {task.completed && <span style={{ color: colors.bg, fontSize: '10px', fontWeight: 800 }}>✓</span>}
      </div>
      <span style={{
        fontSize: '13px',
        color: task.completed ? colors.muted : colors.text,
        textDecoration: task.completed ? 'line-through' : 'none',
        lineHeight: 1.5,
      }}>{task.title}</span>
    </div>
  )
}

function StageSection({ item, stage, active, done, reloadToken }) {
  const [tasks, setTasks] = useState([])
  const stageInfo = STAGES[STAGE_INDEX[stage]]
  const reqId = useRef(0)

  useEffect(() => {
    loadTasks()
  }, [item.id, stage, reloadToken])

  async function loadTasks() {
    const id = ++reqId.current
    const { data } = await fetchTasksForStage('item', item.id, stage)
    if (id !== reqId.current) return
    if (data) {
      setTasks(data)
    }
  }

  async function handleToggle(task) {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))
    const { error } = await toggleTask(task.id, !task.completed)
    if (error) loadTasks()
  }

  const doneTasks = tasks.filter(t => t.completed).length
  const showBody = tasks.length > 0 || (active && stage === 'finalization')

  return (
    <div style={{
      marginBottom: '8px',
      border: `1px solid ${colors.border}`,
      overflow: 'hidden',
      background: active ? colors.card : colors.card,
    }}>
      <div
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: (active || done) ? `1px solid ${colors.border}` : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '8px', height: '8px',
              background: done || active ? colors.accentBright : colors.accentDark,
              flexShrink: 0,
            }}
            className={active ? 'pulse-dot' : ''}
          />
          <span style={{
            fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
            color: colors.text,
            fontWeight: active ? 600 : 400,
          }}>
            {stageInfo?.label}
          </span>
          {done && <span className="label-caps" style={{ color: colors.accent }}>✓ завершён</span>}
        </div>
        {tasks.length > 0 && (
          <span className="label-caps" style={{ color: active ? colors.accent : colors.muted }}>
            {doneTasks}/{tasks.length}
          </span>
        )}
      </div>

      {showBody && (
        <div style={{ padding: '20px' }}>
          {tasks.length > 0 && (
            <div>
              <p className="label-caps" style={{ marginBottom: '12px' }}>Задачи</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {tasks.map(task => (
                  <TaskItem key={task.id} task={task} onToggle={() => handleToggle(task)} />
                ))}
              </div>
            </div>
          )}

          {active && stage === 'finalization' && (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <p className="label-caps" style={{ color: colors.accent }}>Позиция на финальном этапе</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ItemPage() {
  const { dropId, itemId } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [drop, setDrop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [renameModal, setRenameModal] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [tasksVersion, setTasksVersion] = useState(0)
  const [advancing, setAdvancing] = useState(false)
  const [currentStageTasksDone, setCurrentStageTasksDone] = useState(false)

  useEffect(() => {
    setLoading(true)
    setItem(null)
    setDrop(null)
    setNotFound(false)
    load()
    let isActive = true
    let unsubItem = null
    let unsubTasks = null
    pb.collection('items').subscribe(itemId, load).then(fn => {
      if (isActive) unsubItem = fn
      else fn()
    })
    pb.collection('tasks').subscribe(`scope_id = "${itemId}"`, () => {
      setTasksVersion(v => v + 1)
    }).then(fn => {
      if (isActive) unsubTasks = fn
      else fn()
    })
    return () => {
      isActive = false
      unsubItem?.()
      unsubTasks?.()
    }
  }, [dropId, itemId])

  useEffect(() => {
    if (!itemId || !item) return
    let cancelled = false
    ;(async () => {
      const { data } = await fetchTasksForStage('item', itemId, item.stage)
      if (cancelled) return
      const list = data ?? []
      setCurrentStageTasksDone(list.length === 0 || list.every(t => t.completed))
    })()
    return () => { cancelled = true }
  }, [itemId, item?.stage, tasksVersion])

  async function load() {
    const [{ data: i }, { data: d }] = await Promise.all([fetchItem(itemId), fetchDrop(dropId)])
    if (!i || i.drop_id !== dropId) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setItem(i)
    if (d) setDrop(d)
    setLoading(false)
  }

  async function handleAdvanceStage() {
    const next = NEXT_STAGE[item.stage]
    if (!next) return
    setAdvancing(true)
    const { error } = await advanceItemStage(itemId, next)
    setAdvancing(false)
    if (error) {
      alert(error.message || String(error))
    } else {
      load()
    }
  }

  function openRenameModal() {
    setRenameValue(item?.name || '')
    setRenameModal(true)
  }

  async function handleRename(e) {
    e.preventDefault()
    const name = renameValue.trim()
    if (!name) return
    setRenaming(true)
    const { data, error } = await updateItemName(itemId, name)
    setRenaming(false)
    if (!error && data) {
      setItem(data)
      setRenameModal(false)
    }
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

  if (notFound || !item) {
    return (
      <AppShell title="НЕ НАЙДЕНО">
        <p style={{ color: colors.muted, textAlign: 'center', padding: '40px' }}>Позиция не найдена</p>
      </AppShell>
    )
  }

  return (
    <AppShell
      title={item.name}
      tabs={[
        { label: 'ДРОПЫ', href: '/', active: false },
        { label: (drop?.name || 'Дроп').toUpperCase(), href: `/drops/${dropId}`, active: false },
        { label: item.name.toUpperCase(), href: `/drops/${dropId}/items/${itemId}`, active: true },
      ]}
    >
      <button type="button" onClick={() => navigate(`/drops/${dropId}`)} style={{ ...btnGhost, marginBottom: '16px' }}>
        ← В ДРОП
      </button>

      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
          marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${colors.border}`,
        }}>
          <div style={{ minWidth: 0 }}>
            <p className="label-caps" style={{ marginBottom: '6px' }}>Название</p>
            <p style={{ fontSize: '16px', fontWeight: 500, color: colors.text, wordBreak: 'break-word' }}>
              {item.name}
            </p>
            {drop && (
              <p style={{ fontSize: '12px', color: colors.muted, marginTop: '8px' }}>{drop.name}</p>
            )}
          </div>
          <button type="button" onClick={openRenameModal} style={btnGhost}>
            ИЗМЕНИТЬ
          </button>
        </div>

        <ItemMeta item={item} onUpdated={setItem} embedded />
      </div>

      <Modal open={renameModal} onClose={() => setRenameModal(false)} title="НАЗВАНИЕ ПОЗИЦИИ">
        <form onSubmit={handleRename} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={formLabel}>Название</label>
            <input
              placeholder="Например: OVERSIZED HOODIE BLACK"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={renaming || !renameValue.trim()}
            style={{ ...btnOutline, cursor: renaming || !renameValue.trim() ? 'not-allowed' : 'pointer' }}
          >
            {renaming ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'}
          </button>
        </form>
      </Modal>

      {STAGES.map(s => (
        <StageSection
          key={s.key}
          item={item}
          stage={s.key}
          active={s.key === item.stage}
          done={STAGE_INDEX[item.stage] > STAGE_INDEX[s.key]}
          reloadToken={tasksVersion}
        />
      ))}

      {item.stage !== 'finalization' && (
        <button
          type="button"
          onClick={handleAdvanceStage}
          disabled={advancing || !currentStageTasksDone}
          title={
            currentStageTasksDone
              ? 'Перейти к следующему этапу'
              : 'Сначала отметь все задачи текущего этапа'
          }
          style={{
            ...btnOutline,
            width: '100%',
            marginTop: '8px',
            ...(advancing || !currentStageTasksDone ? btnOutlineLockedStyle(true) : { cursor: 'pointer' }),
          }}
        >
          {advancing ? 'ПЕРЕХОД...' : 'ПЕРЕЙТИ НА СЛЕДУЮЩИЙ ЭТАП'}
        </button>
      )}
    </AppShell>
  )
}
