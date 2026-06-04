'use client'

import { useState } from 'react'
import AppShell from './AppShell'
import Modal from './Modal'
import { useStore } from '@/hooks/useStore'
import { newId } from '@/lib/id'
import { formatRub } from '@/lib/money'
import type { Contractor, Material, Store } from '@/lib/types'

function EntityForm({
  title,
  nameLabel,
  initialName,
  initialExtra,
  extraLabel,
  extraType = 'number',
  onSubmit,
  onClose,
}: {
  title: string
  nameLabel: string
  initialName: string
  initialExtra?: string
  extraLabel?: string
  extraType?: string
  onSubmit: (name: string, extra: number) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initialName)
  const [extra, setExtra] = useState(initialExtra ?? '')

  return (
    <Modal open onClose={onClose} title={title}>
      <form
        className="space-y-4"
        onSubmit={e => {
          e.preventDefault()
          if (!name.trim()) return
          onSubmit(name.trim(), Number(extra) || 0)
        }}
      >
        <div>
          <label className="label-caps mb-1 block">{nameLabel}</label>
          <input
            className="input-field"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        {extraLabel && (
          <div>
            <label className="label-caps mb-1 block">{extraLabel}</label>
            <input
              type={extraType}
              min={extraType === 'number' ? 0 : undefined}
              className="input-field"
              value={extra}
              onChange={e => setExtra(e.target.value)}
            />
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn-primary flex-1">
            Сохранить
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ContractorForm({
  title,
  initialName,
  initialNotes,
  onSubmit,
  onClose,
}: {
  title: string
  initialName: string
  initialNotes: string
  onSubmit: (name: string, notes: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initialName)
  const [notes, setNotes] = useState(initialNotes)

  return (
    <Modal open onClose={onClose} title={title}>
      <form
        className="space-y-4"
        onSubmit={e => {
          e.preventDefault()
          if (!name.trim()) return
          onSubmit(name.trim(), notes.trim())
        }}
      >
        <div>
          <label className="label-caps mb-1 block">Название</label>
          <input
            className="input-field"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label-caps mb-1 block">Комментарии</label>
          <textarea
            className="input-field"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Контакты, адрес, особенности…"
          />
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn-primary flex-1">
            Сохранить
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function CatalogView() {
  const { store, loading, error, save } = useStore()
  const [materialModal, setMaterialModal] = useState<
    | null
    | { mode: 'add' }
    | { mode: 'edit'; item: Material }
  >(null)
  const [contractorModal, setContractorModal] = useState<
    | null
    | { mode: 'add' }
    | { mode: 'edit'; item: Contractor }
  >(null)

  if (loading) {
    return (
      <AppShell title="СПРАВОЧНИКИ">
        <div className="flex items-center gap-2 py-12 text-[#C8C8C8]">
          <span className="spinner" />
          <span>Загрузка…</span>
        </div>
      </AppShell>
    )
  }

  if (error || !store) {
    return (
      <AppShell title="СПРАВОЧНИКИ">
        <p className="text-[#F87171]">{error ?? 'Нет данных'}</p>
      </AppShell>
    )
  }

  const deleteMaterial = async (id: string) => {
    if (!confirm('Удалить материал?')) return
    const next: Store = {
      ...store,
      materials: store.materials.filter(m => m.id !== id),
    }
    await save(next)
  }

  const deleteContractor = async (id: string) => {
    const linked = store.handoffs.some(h => h.contractorId === id)
    if (linked) {
      alert('Нельзя удалить: есть отдачи по этому производству')
      return
    }
    if (!confirm('Удалить производство?')) return
    const next: Store = {
      ...store,
      contractors: store.contractors.filter(c => c.id !== id),
    }
    await save(next)
  }

  const saveMaterial = async (name: string, pricePerRoll: number) => {
    if (materialModal?.mode === 'edit') {
      await save({
        ...store,
        materials: store.materials.map(m =>
          m.id === materialModal.item.id ? { ...m, name, pricePerRoll } : m,
        ),
      })
    } else {
      await save({
        ...store,
        materials: [...store.materials, { id: newId(), name, pricePerRoll }],
      })
    }
    setMaterialModal(null)
  }

  const saveContractor = async (name: string, notes: string) => {
    if (contractorModal?.mode === 'edit') {
      await save({
        ...store,
        contractors: store.contractors.map(c =>
          c.id === contractorModal.item.id ? { ...c, name, notes } : c,
        ),
      })
    } else {
      await save({
        ...store,
        contractors: [
          ...store.contractors,
          { id: newId(), name, loadPercent: 0, notes },
        ],
      })
    }
    setContractorModal(null)
  }

  return (
    <AppShell title="СПРАВОЧНИКИ">
      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white">
            Материалы (рулоны)
          </h2>
          <button type="button" className="btn-primary" onClick={() => setMaterialModal({ mode: 'add' })}>
            + Материал
          </button>
        </div>
        {store.materials.length === 0 ? (
          <p className="text-sm text-[#9AA8A3]">Список пуст</p>
        ) : (
          <div className="dashboard-drops-list">
            {store.materials.map(m => (
              <div key={m.id} className="drop-row card items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{m.name}</p>
                  <p className="text-sm text-[#C8C8C8]">{formatRub(m.pricePerRoll)} / рулон</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setMaterialModal({ mode: 'edit', item: m })}
                  >
                    Изм.
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-[#F87171]"
                    onClick={() => deleteMaterial(m.id)}
                  >
                    Удал.
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white">
            Производства
          </h2>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setContractorModal({ mode: 'add' })}
          >
            + Производство
          </button>
        </div>
        {store.contractors.length === 0 ? (
          <p className="text-sm text-[#9AA8A3]">Список пуст</p>
        ) : (
          <div className="dashboard-drops-list">
            {store.contractors.map(c => (
              <div key={c.id} className="drop-row card items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{c.name}</p>
                  {c.notes ? (
                    <p className="mt-1 text-sm text-[#C8C8C8] whitespace-pre-wrap">{c.notes}</p>
                  ) : (
                    <p className="mt-1 text-sm text-[#9AA8A3]">Без комментария</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setContractorModal({ mode: 'edit', item: c })}
                  >
                    Изм.
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-[#F87171]"
                    onClick={() => deleteContractor(c.id)}
                  >
                    Удал.
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {materialModal && (
        <EntityForm
          title={materialModal.mode === 'add' ? 'Новый материал' : 'Редактировать материал'}
          nameLabel="Название"
          initialName={materialModal.mode === 'edit' ? materialModal.item.name : ''}
          initialExtra={
            materialModal.mode === 'edit' ? String(materialModal.item.pricePerRoll) : ''
          }
          extraLabel="Цена за рулон, ₽"
          onSubmit={saveMaterial}
          onClose={() => setMaterialModal(null)}
        />
      )}

      {contractorModal && (
        <ContractorForm
          title={
            contractorModal.mode === 'add' ? 'Новое производство' : 'Редактировать производство'
          }
          initialName={contractorModal.mode === 'edit' ? contractorModal.item.name : ''}
          initialNotes={contractorModal.mode === 'edit' ? contractorModal.item.notes : ''}
          onSubmit={saveContractor}
          onClose={() => setContractorModal(null)}
        />
      )}
    </AppShell>
  )
}
