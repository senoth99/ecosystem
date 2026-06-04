'use client'

import ProductThumb from './ProductThumb'
import type { Handoff, Material } from '@/lib/types'
import { handoffRollsTotal } from '@/lib/money'
import {
  formatRub,
  handoffHasDefect,
  handoffLineSewingCost,
  handoffLineSewingCostActual,
  handoffMaterialCost,
  handoffSewingCost,
  handoffSewingCostActual,
  handoffTotal,
  handoffTotalActual,
  lineDefectQty,
} from '@/lib/money'
import { deadlineStatus, formatHandoffDate } from '@/lib/handoff'

export default function HandoffCard({
  handoff: h,
  materials,
  archived,
  onAccept,
  accepting,
  onEdit,
}: {
  handoff: Handoff
  materials: Material[]
  archived?: boolean
  onAccept?: () => void
  accepting?: boolean
  onEdit?: () => void
}) {
  const useActual = archived && h.acceptedAt != null
  const total = useActual ? handoffTotalActual(h) : handoffTotal(h)
  const itemCount = h.items.length
  const dl = deadlineStatus(h.deadline, h.acceptedAt)
  const dlColor =
    dl === 'overdue' ? '#F87171' : dl === 'soon' ? '#F0B429' : '#9AA8A3'
  const hasDefect = useActual && handoffHasDefect(h)

  return (
    <div
      className={`drop-row card flex-col gap-4 p-4${archived ? ' opacity-[0.88]' : ''}`}
    >
      <div className="drop-row__head">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold text-white">
            {itemCount === 1 ? h.items[0].product.name : `Отдача · ${itemCount} поз.`}
          </h3>
          {archived && h.acceptedAt && (
            <p className="mt-1 text-xs text-[#14C97A]">
              Принято {formatHandoffDate(h.acceptedAt)}
              {hasDefect && (
                <span className="text-[#F87171]"> · был брак</span>
              )}
            </p>
          )}
        </div>
        <span className="shrink-0 text-sm font-semibold text-[#14C97A]">
          {formatRub(total)}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {h.items.map(line => {
          const defect = lineDefectQty(line)
          const accepted = line.acceptedQuantity ?? line.quantity
          return (
            <div
              key={line.product.id}
              className="flex items-center gap-3 border border-[#3D5248] bg-[#050505] p-2"
            >
              <ProductThumb src={line.product.image} alt={line.product.name} size={48} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{line.product.name}</p>
                <p className="text-xs text-[#9AA8A3]">
                  {useActual ? (
                    <>
                      отдано {line.quantity} · принято {accepted} шт
                      {defect > 0 && (
                        <span className="text-[#F87171]"> · брак {defect}</span>
                      )}
                      {' · '}
                      отшив {formatRub(
                        useActual
                          ? handoffLineSewingCostActual(line)
                          : handoffLineSewingCost(line),
                      )}
                    </>
                  ) : (
                    <>
                      {line.quantity} шт · отшив {formatRub(line.sewingPricePerUnit)}/шт ·{' '}
                      {formatRub(handoffLineSewingCost(line))}
                    </>
                  )}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="drop-row__meta">
        {h.deadline && (
          <span>
            <span className="label-caps">Дедлайн </span>
            <span style={{ color: archived ? '#9AA8A3' : dlColor }}>
              {formatHandoffDate(h.deadline)}
            </span>
          </span>
        )}
        <span>
          <span className="label-caps">Рулонов </span>
          <span className="text-white">{handoffRollsTotal(h)}</span>
        </span>
        <span>
          <span className="label-caps">Шт всего </span>
          <span className="text-white">
            {useActual
              ? h.items.reduce((s, l) => s + (l.acceptedQuantity ?? l.quantity), 0)
              : h.items.reduce((s, l) => s + l.quantity, 0)}
          </span>
        </span>
      </div>

      <div className="text-xs text-[#9AA8A3]">
        Ткань {formatRub(handoffMaterialCost(h))} · Отшив{' '}
        {formatRub(useActual ? handoffSewingCostActual(h) : handoffSewingCost(h))} · создано{' '}
        {formatHandoffDate(h.createdAt)}
      </div>

      {h.materialRolls.length > 0 && (
        <div className="space-y-1 border border-[#3D5248] bg-[#050505] p-2">
          <p className="label-caps">Материалы</p>
          {h.materialRolls.map((mr, i) => {
            const name = materials.find(m => m.id === mr.materialId)?.name ?? '—'
            return (
              <p key={`${mr.materialId}-${i}`} className="text-xs text-[#C8C8C8]">
                {name} — {mr.rolls} рул. · {formatRub(mr.rolls * mr.pricePerRoll)}
              </p>
            )
          })}
        </div>
      )}

      {h.notes && <p className="text-sm text-[#C8C8C8]">{h.notes}</p>}

      {((onEdit && !archived) || (!archived && onAccept)) && (
        <div className="flex flex-wrap gap-2">
          {onEdit && !archived && (
            <button type="button" className="btn-ghost" onClick={onEdit}>
              Изменить
            </button>
          )}
          {!archived && onAccept && (
            <button
              type="button"
              className="btn-primary"
              disabled={accepting}
              onClick={onAccept}
            >
              {accepting ? 'Сохранение…' : 'Принять'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
