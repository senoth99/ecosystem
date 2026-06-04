'use client'

import { useEffect, useState } from 'react'
import Modal from './Modal'
import ProductThumb from './ProductThumb'
import type { Handoff } from '@/lib/types'
import { lineDefectQty } from '@/lib/money'

export default function AcceptHandoffModal({
  handoff,
  open,
  onClose,
  onConfirm,
  submitting,
}: {
  handoff: Handoff | null
  open: boolean
  onClose: () => void
  onConfirm: (acceptedByProductId: Record<number, number>) => void
  submitting?: boolean
}) {
  const [draft, setDraft] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!open || !handoff) return
    const initial: Record<number, string> = {}
    for (const line of handoff.items) {
      initial[line.product.id] = String(line.quantity)
    }
    setDraft(initial)
  }, [open, handoff])

  if (!handoff) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result: Record<number, number> = {}
    for (const line of handoff.items) {
      const n = Number(draft[line.product.id])
      if (!Number.isFinite(n) || n < 0 || n > line.quantity) return
      result[line.product.id] = Math.floor(n)
    }
    onConfirm(result)
  }

  const allValid = handoff.items.every(line => {
    const n = Number(draft[line.product.id])
    return Number.isFinite(n) && n >= 0 && n <= line.quantity
  })

  return (
    <Modal open={open} onClose={onClose} title="Принять отдачу" maxWidth="520px">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-[#C8C8C8]">
          Укажите, сколько фактически принято по каждой позиции. Разница с отданным — брак.
        </p>

        <div className="space-y-3">
          {handoff.items.map(line => {
            const accepted = Number(draft[line.product.id])
            const defect =
              Number.isFinite(accepted) && accepted >= 0
                ? Math.max(0, line.quantity - Math.floor(accepted))
                : null

            return (
              <div key={line.product.id} className="card p-3">
                <div className="mb-3 flex items-center gap-3">
                  <ProductThumb src={line.product.image} alt={line.product.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{line.product.name}</p>
                    <p className="text-xs text-[#9AA8A3]">Отдано: {line.quantity} шт</p>
                  </div>
                </div>
                <label className="label-caps mb-1 block">Принято фактически, шт</label>
                <input
                  type="number"
                  min={0}
                  max={line.quantity}
                  className="input-field"
                  value={draft[line.product.id] ?? ''}
                  onChange={e =>
                    setDraft(prev => ({ ...prev, [line.product.id]: e.target.value }))
                  }
                  required
                />
                {defect !== null && defect > 0 && (
                  <p className="mt-2 text-xs text-[#F87171]">Брак: {defect} шт</p>
                )}
                {defect === 0 && Number.isFinite(accepted) && (
                  <p className="mt-2 text-xs text-[#14C97A]">Без брака</p>
                )}
              </div>
            )
          })}
        </div>

        {handoff.items.some(line => {
          const n = Number(draft[line.product.id])
          return Number.isFinite(n) && lineDefectQty({ ...line, acceptedQuantity: Math.floor(n) }) > 0
        }) && (
          <p className="text-xs text-[#F0B429]">
            Есть позиции с браком — отдача уйдёт в архив с отметкой о расхождении.
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose} disabled={submitting}>
            Отмена
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={!allValid || submitting}>
            {submitting ? 'Сохранение…' : 'Принять'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
