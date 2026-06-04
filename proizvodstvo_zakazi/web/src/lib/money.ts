import type { Handoff, HandoffLine } from './types'

export function handoffMaterialCost(h: Pick<Handoff, 'materialRolls'>) {
  return h.materialRolls.reduce((s, m) => s + m.rolls * m.pricePerRoll, 0)
}

export function handoffRollsTotal(h: Pick<Handoff, 'materialRolls'>) {
  return h.materialRolls.reduce((s, m) => s + m.rolls, 0)
}

export function lineAcceptedQty(line: HandoffLine) {
  return line.acceptedQuantity ?? line.quantity
}

export function lineDefectQty(line: HandoffLine) {
  if (line.acceptedQuantity == null) return 0
  return Math.max(0, line.quantity - line.acceptedQuantity)
}

export function handoffLineSewingCost(line: Pick<HandoffLine, 'quantity' | 'sewingPricePerUnit'>) {
  return line.quantity * line.sewingPricePerUnit
}

export function handoffLineSewingCostActual(line: HandoffLine) {
  return lineAcceptedQty(line) * line.sewingPricePerUnit
}

export function handoffSewingCost(h: Pick<Handoff, 'items'>) {
  return h.items.reduce((s, line) => s + handoffLineSewingCost(line), 0)
}

export function handoffSewingCostActual(h: Pick<Handoff, 'items'>) {
  return h.items.reduce((s, line) => s + handoffLineSewingCostActual(line), 0)
}

export function handoffTotal(h: Pick<Handoff, 'materialRolls' | 'items'>) {
  return handoffMaterialCost(h) + handoffSewingCost(h)
}

export function handoffTotalActual(h: Pick<Handoff, 'materialRolls' | 'items'>) {
  return handoffMaterialCost(h) + handoffSewingCostActual(h)
}

export function handoffHasDefect(h: Pick<Handoff, 'items'>) {
  return h.items.some(l => lineDefectQty(l) > 0)
}

export function formatRub(n: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(n)
}
