'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ApiProduct, ProductRef } from '@/lib/types'
import ProductThumb from './ProductThumb'

function normalizeProducts(data: unknown): ApiProduct[] {
  if (Array.isArray(data)) return data as ApiProduct[]
  if (data && typeof data === 'object' && Array.isArray((data as { products?: unknown }).products)) {
    return (data as { products: ApiProduct[] }).products
  }
  return []
}

export function apiProductToRef(p: ApiProduct): ProductRef {
  const imgs = p.images as string[] | undefined
  const img =
    (Array.isArray(imgs) && imgs[0]) ||
    (typeof p.image === 'string' ? p.image : null) ||
    (typeof p.photo === 'string' ? p.photo : null) ||
    ''
  return {
    id: Number(p.id),
    name: String(p.name ?? ''),
    image: img,
  }
}

export default function ProductPicker({
  value,
  onChange,
  multi,
  addedIds = [],
  onAdd,
}: {
  value?: ProductRef | null
  onChange?: (p: ProductRef) => void
  multi?: boolean
  addedIds?: number[]
  onAdd?: (p: ProductRef) => void
}) {
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/products')
      .then(r => {
        if (!r.ok) throw new Error('Ошибка загрузки каталога')
        return r.json()
      })
      .then(data => {
        if (!cancelled) setProducts(normalizeProducts(data))
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(p => String(p.name ?? '').toLowerCase().includes(q))
  }, [products, query])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-[#C8C8C8]">
        <span className="spinner" />
        <span className="text-sm">Загрузка продуктов…</span>
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-[#F87171]">{error}</p>
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        className="input-field"
        placeholder="Поиск по названию…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {multi ? (
        <p className="text-xs text-[#9AA8A3]">
          Нажмите на товар, чтобы добавить в отдачу ({addedIds.length} в списке)
        </p>
      ) : (
        value && (
          <div className="card flex items-center gap-3 p-3">
            <ProductThumb src={value.image} alt={value.name} size={48} />
            <div className="min-w-0 flex-1">
              <p className="label-caps">Выбрано</p>
              <p className="truncate text-sm font-semibold text-white">{value.name}</p>
            </div>
          </div>
        )
      )}
      <div className="max-h-[220px] overflow-y-auto border border-[#3D5248]">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-[#9AA8A3]">Ничего не найдено</p>
        ) : (
          filtered.map(p => {
            const ref = apiProductToRef(p)
            const added = addedIds.includes(ref.id)
            const selected = !multi && value?.id === ref.id
            return (
              <button
                key={ref.id}
                type="button"
                disabled={multi && added}
                onClick={() => {
                  if (multi) {
                    if (!added) onAdd?.(ref)
                  } else {
                    onChange?.(ref)
                  }
                }}
                className={`flex w-full items-center gap-3 border-b border-[#3D5248] p-3 text-left last:border-b-0 ${
                  selected || added
                    ? 'bg-[#0E7A45]/30'
                    : 'bg-[#1A1F1C] hover:bg-[#121a16] disabled:cursor-default disabled:opacity-60'
                }`}
              >
                <ProductThumb src={ref.image} alt={ref.name} size={40} />
                <span className="min-w-0 flex-1 truncate text-sm text-white">{ref.name}</span>
                {multi && added && (
                  <span className="label-caps shrink-0 text-[#14C97A]">добавлен</span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
