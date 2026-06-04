'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import ProductPicker from './ProductPicker'
import ProductThumb from './ProductThumb'
import type { Handoff, HandoffLine, HandoffMaterialRoll, ProductRef, Store } from '@/lib/types'
import { handoffTotal, formatRub } from '@/lib/money'
import { newId } from '@/lib/id'

type LineDraft = {
  product: ProductRef
  quantity: string
  sewingPrice: string
}

type RollDraft = {
  key: string
  materialId: string
  rolls: string
}

function handoffToDraft(h: Handoff): {
  lines: LineDraft[]
  rollDrafts: RollDraft[]
  notes: string
  deadline: string
} {
  return {
    lines: h.items.map(line => ({
      product: line.product,
      quantity: String(line.quantity),
      sewingPrice: String(line.sewingPricePerUnit),
    })),
    rollDrafts: h.materialRolls.map(r => ({
      key: newId(),
      materialId: r.materialId,
      rolls: String(r.rolls),
    })),
    notes: h.notes,
    deadline: h.deadline ?? '',
  }
}

function buildMaterialRolls(
  drafts: RollDraft[],
  store: Store,
): HandoffMaterialRoll[] | null {
  const result: HandoffMaterialRoll[] = []
  for (const d of drafts) {
    const mat = store.materials.find(m => m.id === d.materialId)
    const rolls = Number(d.rolls)
    if (!mat || !rolls || rolls < 1) return null
    result.push({
      materialId: mat.id,
      pricePerRoll: mat.pricePerRoll,
      rolls,
    })
  }
  if (result.length === 0) return null
  return result
}

export default function HandoffForm({
  open,
  onClose,
  contractorId,
  store,
  onSave,
  editing,
}: {
  open: boolean
  onClose: () => void
  contractorId: string
  store: Store
  onSave: (next: Store) => Promise<unknown>
  editing?: Handoff | null
}) {
  const isEdit = Boolean(editing)
  const [lines, setLines] = useState<LineDraft[]>([])
  const [rollDrafts, setRollDrafts] = useState<RollDraft[]>([])
  const [notes, setNotes] = useState('')
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      const d = handoffToDraft(editing)
      setLines(d.lines)
      setRollDrafts(d.rollDrafts.length > 0 ? d.rollDrafts : [{ key: newId(), materialId: '', rolls: '' }])
      setNotes(d.notes)
      setDeadline(d.deadline)
    } else {
      setLines([])
      setRollDrafts([{ key: newId(), materialId: '', rolls: '' }])
      setNotes('')
      setDeadline('')
    }
  }, [open, editing])

  const addedIds = useMemo(() => lines.map(l => l.product.id), [lines])

  const materialRollsPreview = useMemo(
    () => buildMaterialRolls(rollDrafts, store),
    [rollDrafts, store],
  )

  const preview = useMemo(() => {
    if (!materialRollsPreview || lines.length === 0) return null
    const items: HandoffLine[] = lines.map(l => ({
      product: l.product,
      quantity: Number(l.quantity) || 0,
      sewingPricePerUnit: Number(l.sewingPrice) || 0,
    }))
    return handoffTotal({ materialRolls: materialRollsPreview, items })
  }, [lines, materialRollsPreview])

  const addRollRow = () => {
    setRollDrafts(prev => [...prev, { key: newId(), materialId: '', rolls: '' }])
  }

  const removeRollRow = (key: string) => {
    setRollDrafts(prev => (prev.length <= 1 ? prev : prev.filter(r => r.key !== key)))
  }

  const updateRollRow = (key: string, patch: Partial<Pick<RollDraft, 'materialId' | 'rolls'>>) => {
    setRollDrafts(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)))
  }

  const addProduct = (p: ProductRef) => {
    setLines(prev => [...prev, { product: p, quantity: '', sewingPrice: '' }])
  }

  const removeLine = (productId: number) => {
    setLines(prev => prev.filter(l => l.product.id !== productId))
  }

  const updateLine = (productId: number, patch: Partial<Pick<LineDraft, 'quantity' | 'sewingPrice'>>) => {
    setLines(prev =>
      prev.map(l => (l.product.id === productId ? { ...l, ...patch } : l)),
    )
  }

  const buildHandoffPayload = (): Handoff | null => {
    if (lines.length === 0) return null
    const materialRolls = buildMaterialRolls(rollDrafts, store)
    if (!materialRolls) return null

    const items: HandoffLine[] = []
    for (const l of lines) {
      const qty = Number(l.quantity)
      const sew = Number(l.sewingPrice)
      if (!qty || qty < 1 || sew < 0) return null
      items.push({
        product: l.product,
        quantity: qty,
        sewingPricePerUnit: sew,
      })
    }

    if (!deadline) return null

    const base = {
      items,
      materialRolls,
      notes: notes.trim(),
      deadline,
    }

    if (editing) {
      return { ...editing, ...base }
    }

    return {
      id: newId(),
      contractorId,
      ...base,
      acceptedAt: null,
      createdAt: new Date().toISOString(),
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const handoff = buildHandoffPayload()
    if (!handoff) return

    setSubmitting(true)
    try {
      if (isEdit) {
        await onSave({
          ...store,
          handoffs: store.handoffs.map(h => (h.id === handoff.id ? handoff : h)),
        })
      } else {
        await onSave({
          ...store,
          handoffs: [...store.handoffs, handoff],
        })
      }
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const linesValid =
    lines.length > 0 &&
    lines.every(l => Number(l.quantity) >= 1 && Number(l.sewingPrice) >= 0)

  const rollsValid = materialRollsPreview !== null

  const canSubmit = linesValid && rollsValid && Boolean(deadline) && !submitting

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Редактировать отдачу' : 'Новая отдача'}
      maxWidth="640px"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="label-caps mb-2">Товары</p>
          <ProductPicker multi addedIds={addedIds} onAdd={addProduct} />
        </div>

        {lines.length > 0 && (
          <div className="space-y-2">
            <p className="label-caps">Позиции ({lines.length})</p>
            {lines.map(line => (
              <div key={line.product.id} className="card p-3">
                <div className="mb-3 flex items-start gap-3">
                  <ProductThumb src={line.product.image} alt={line.product.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{line.product.name}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost shrink-0 px-2 py-1 text-[10px]"
                    onClick={() => removeLine(line.product.id)}
                  >
                    Убрать
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label-caps mb-1 block">Кол-во, шт</label>
                    <input
                      type="number"
                      min={1}
                      className="input-field"
                      value={line.quantity}
                      onChange={e => updateLine(line.product.id, { quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label-caps mb-1 block">Отшив, ₽/шт</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="input-field"
                      value={line.sewingPrice}
                      onChange={e => updateLine(line.product.id, { sewingPrice: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="label-caps">Рулоны (материалы)</p>
            <button type="button" className="btn-ghost px-2 py-1 text-[10px]" onClick={addRollRow}>
              + Рулон
            </button>
          </div>
          {store.materials.length === 0 ? (
            <p className="text-xs text-[#9AA8A3]">Добавьте материалы в «Справочники»</p>
          ) : (
            <div className="space-y-2">
              {rollDrafts.map(row => (
                <div key={row.key} className="card grid gap-3 p-3 sm:grid-cols-[1fr_100px_auto]">
                  <div>
                    <label className="label-caps mb-1 block">Материал</label>
                    <select
                      value={row.materialId}
                      onChange={e => updateRollRow(row.key, { materialId: e.target.value })}
                      required
                      className="input-field"
                    >
                      <option value="">— выберите —</option>
                      {store.materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {formatRub(m.pricePerRoll)}/рулон
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-caps mb-1 block">Рулонов</label>
                    <input
                      type="number"
                      min={1}
                      className="input-field"
                      value={row.rolls}
                      onChange={e => updateRollRow(row.key, { rolls: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      className="btn-ghost px-2 py-2 text-[10px]"
                      onClick={() => removeRollRow(row.key)}
                      disabled={rollDrafts.length <= 1}
                    >
                      Убрать
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="label-caps mb-1 block">Дедлайн</label>
          <input
            type="date"
            className="input-field"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label-caps mb-1 block">Заметки</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        </div>

        {preview !== null && (
          <p className="text-sm text-[#C8C8C8]">
            Итого: <span className="font-semibold text-white">{formatRub(preview)}</span>
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={!canSubmit}>
            {submitting ? 'Сохранение…' : isEdit ? 'Сохранить' : `Создать (${lines.length})`}
          </button>
        </div>
      </form>
    </Modal>
  )
}
