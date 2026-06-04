import fs from 'fs/promises'
import path from 'path'
import type { Handoff, HandoffLine, HandoffMaterialRoll, ProductRef, Store } from './types'

function handoffMeta(raw: Record<string, unknown>) {
  return {
    deadline:
      typeof raw.deadline === 'string' && raw.deadline ? raw.deadline : null,
    acceptedAt:
      typeof raw.acceptedAt === 'string' && raw.acceptedAt ? raw.acceptedAt : null,
  }
}

function normalizeMaterialRolls(raw: Record<string, unknown>): HandoffMaterialRoll[] {
  if (Array.isArray(raw.materialRolls)) {
    return (raw.materialRolls as HandoffMaterialRoll[])
      .map(m => ({
        materialId: String(m.materialId ?? ''),
        rolls: Number(m.rolls) || 0,
        pricePerRoll: Number(m.pricePerRoll) || 0,
      }))
      .filter(m => m.materialId && m.rolls > 0)
  }
  const materialId = String(raw.materialId ?? '')
  const rolls = Number(raw.rolls) || 0
  if (materialId && rolls > 0) {
    return [
      {
        materialId,
        rolls,
        pricePerRoll: Number(raw.pricePerRoll) || 0,
      },
    ]
  }
  return []
}

function normalizeHandoff(raw: Record<string, unknown>): Handoff {
  const meta = handoffMeta(raw)
  const materialRolls = normalizeMaterialRolls(raw)

  if (Array.isArray(raw.items) && raw.items.length > 0) {
    const h = raw as unknown as Handoff
    return {
      id: String(h.id ?? raw.id ?? ''),
      contractorId: String(h.contractorId ?? raw.contractorId ?? ''),
      items: h.items,
      materialRolls,
      notes: String(h.notes ?? raw.notes ?? ''),
      createdAt: String(h.createdAt ?? raw.createdAt ?? new Date().toISOString()),
      ...meta,
    }
  }

  const legacyProduct = raw.product as ProductRef | undefined
  if (legacyProduct) {
    const line: HandoffLine = {
      product: legacyProduct,
      quantity: Number(raw.quantity) || 0,
      sewingPricePerUnit: Number(raw.sewingPricePerUnit) || 0,
    }
    return {
      id: String(raw.id ?? ''),
      contractorId: String(raw.contractorId ?? ''),
      items: [line],
      materialRolls,
      notes: String(raw.notes ?? ''),
      createdAt: String(raw.createdAt ?? new Date().toISOString()),
      ...meta,
    }
  }

  const partial = raw as unknown as Handoff
  return {
    id: String(partial.id ?? raw.id ?? ''),
    contractorId: String(partial.contractorId ?? raw.contractorId ?? ''),
    items: Array.isArray(raw.items) ? (raw.items as HandoffLine[]) : [],
    materialRolls,
    notes: String(partial.notes ?? raw.notes ?? ''),
    createdAt: String(partial.createdAt ?? raw.createdAt ?? new Date().toISOString()),
    ...meta,
  }
}

function normalizeStore(parsed: Store): Store {
  return {
    contractors: parsed.contractors ?? [],
    materials: parsed.materials ?? [],
    handoffs: (parsed.handoffs ?? []).map(h =>
      normalizeHandoff(h as unknown as Record<string, unknown>),
    ),
  }
}

const STORE_PATH = path.join(process.cwd(), 'data', 'store.json')

const DEFAULT_STORE: Store = {
  contractors: [],
  materials: [],
  handoffs: [],
}

export async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as Store
    return normalizeStore(parsed)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      await writeStore(DEFAULT_STORE)
      return DEFAULT_STORE
    }
    throw err
  }
}

export async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
}
