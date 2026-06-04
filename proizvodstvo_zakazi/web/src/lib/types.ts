export type Contractor = {
  id: string
  name: string
  loadPercent: number
  notes: string
}

export type Material = {
  id: string
  name: string
  pricePerRoll: number
}

export type ProductRef = {
  id: number
  name: string
  image: string
}

export type HandoffLine = {
  product: ProductRef
  quantity: number
  sewingPricePerUnit: number
  /** Фактически принято при приёмке; если меньше quantity — брак */
  acceptedQuantity?: number
}

export type HandoffMaterialRoll = {
  materialId: string
  pricePerRoll: number
  rolls: number
}

export type Handoff = {
  id: string
  contractorId: string
  items: HandoffLine[]
  materialRolls: HandoffMaterialRoll[]
  notes: string
  deadline: string | null
  acceptedAt: string | null
  createdAt: string
}

export type Store = {
  contractors: Contractor[]
  materials: Material[]
  handoffs: Handoff[]
}

export type ApiProduct = {
  id: number | string
  name: string
  images?: string[]
  image?: string | null
  photo?: string | null
  [key: string]: unknown
}
