import { useEffect } from 'react'
import { colors } from '../../lib/theme'

export default function Modal({ open, onClose, title, children, maxWidth = '480px' }) {
  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: colors.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: '16px',
      }}
    >
      <div
        className="card fade-in modal-panel"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth }}
      >
        {title && (
          <div className="modal-panel__header">
            <h3 className="modal-panel__title" style={{ color: colors.text }}>{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="modal-close-btn"
              aria-label="Закрыть"
              style={{
                background: colors.bg,
                border: `1px solid ${colors.bg}`,
                color: colors.muted,
                cursor: 'pointer',
              }}
            >×</button>
          </div>
        )}
        <div className="modal-panel__body">{children}</div>
      </div>
    </div>
  )
}
