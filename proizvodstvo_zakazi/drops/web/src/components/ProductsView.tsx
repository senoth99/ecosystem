'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from './AppShell'
import Modal from './Modal'
import { ItemPhotoThumb } from './ItemMeta'
import { STAGES } from '@/lib/constants'
import type { ProductListRow } from '@/lib/data'
import { createProductAction } from '@/app/actions'

type SortKey = 'created' | 'name'
type FilterKey = 'all' | 'unlinked'

export default function ProductsView({ products }: { products: ProductListRow[] }) {
  const router = useRouter()
  const [modal, setModal] = useState(false)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [dropFilter, setDropFilter] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('created')

  const dropOptions = useMemo(() => {
    const map = new Map<string, string>()
    products.forEach(p => {
      if (p.dropId && p.dropName) map.set(p.dropId, p.dropName)
    })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ru'))
  }, [products])

  const filtered = useMemo(() => {
    let list = [...products]
    if (filter === 'unlinked') list = list.filter(p => !p.dropId)
    if (dropFilter !== 'all') list = list.filter(p => p.dropId === dropFilter)
    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'ru')
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
    return list
  }, [products, filter, dropFilter, sort])

  return (
    <AppShell
      title="ПРОДУКТЫ"
      actions={
        <button type="button" className="btn-outline" onClick={() => setModal(true)}>
          + НОВЫЙ ПРОДУКТ
        </button>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <p className="label-caps mb-1.5">Фильтр</p>
          <select value={filter} onChange={e => setFilter(e.target.value as FilterKey)}>
            <option value="all">Все</option>
            <option value="unlinked">Без дропа</option>
          </select>
        </div>
        <div>
          <p className="label-caps mb-1.5">Дроп</p>
          <select value={dropFilter} onChange={e => setDropFilter(e.target.value)} disabled={filter === 'unlinked'}>
            <option value="all">Все дропы</option>
            {dropOptions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="label-caps mb-1.5">Сортировка</p>
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)}>
            <option value="created">Сначала новые</option>
            <option value="name">По названию</option>
          </select>
        </div>
        <p className="ml-auto text-sm text-[#C8C8C8]">{filtered.length} из {products.length}</p>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-[#3D5248] p-10 text-center text-[13px] text-[#C8C8C8]">
          Нет продуктов по выбранным фильтрам
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(p => {
            const stageInfo = STAGES.find(s => s.key === p.stage)
            const pct = p.tasksTotal > 0 ? Math.round((p.tasksDone / p.tasksTotal) * 100) : 0
            return (
              <Link key={p.id} href={`/products/${p.id}`} className="card flex flex-wrap items-start gap-4 p-4">
                <ItemPhotoThumb
                  item={{ id: p.id, photos: p.thumbPhotoId ? [{ id: p.thumbPhotoId }] : [] }}
                  size={48}
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-medium text-white">{p.name}</span>
                    {p.samplePrinted && (
                      <span className="border border-[#14C97A] px-1.5 py-px text-[10px] uppercase tracking-widest text-[#14C97A]">
                        СЕМПЛ
                      </span>
                    )}
                    {stageInfo && p.tasksTotal > 0 && (
                      <span className="border border-[#14C97A] bg-[#1A1F1C] px-1.5 py-px text-[10px] uppercase tracking-widest text-[#14C97A]">
                        {stageInfo.short}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#C8C8C8]">
                    {p.dropName ? `Дроп: ${p.dropName}` : 'Без дропа'}
                  </p>
                  {p.notes.trim() && (
                    <p className="mt-1 line-clamp-1 text-[12px] text-[#8A9A92]">{p.notes}</p>
                  )}
                  {p.tasksTotal > 0 && (
                    <p className="mt-2 text-[11px] text-[#14C97A]">
                      Задачи: {p.tasksDone}/{p.tasksTotal} ({pct}%)
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="НОВЫЙ ПРОДУКТ">
        <form
          onSubmit={async e => {
            e.preventDefault()
            const res = await createProductAction(name, notes)
            setModal(false)
            setName('')
            setNotes('')
            router.push(`/products/${res.id}`)
          }}
          className="flex flex-col gap-3.5"
        >
          <div>
            <label className="label-caps mb-1.5 block">Название</label>
            <input
              placeholder="Например: OVERSIZED HOODIE BLACK"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label-caps mb-1.5 block">Заметки</label>
            <textarea
              rows={4}
              placeholder="Описание, ткань, размерная сетка..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-outline w-full" disabled={!name.trim()}>
            СОЗДАТЬ
          </button>
        </form>
      </Modal>
    </AppShell>
  )
}
