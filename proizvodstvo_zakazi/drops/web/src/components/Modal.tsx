'use client'

import { useEffect } from 'react'
import { colors } from '@/lib/theme'

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = '480px',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: colors.bg }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card fade-in modal-panel"
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-panel__header">
          <h3 className="modal-panel__title text-white">{title}</h3>
          <button type="button" onClick={onClose} className="modal-close-btn" aria-label="Закрыть">×</button>
        </div>
        <div className="modal-panel__body">{children}</div>
      </div>
    </div>
  )
}
