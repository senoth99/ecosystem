'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AppShell from './AppShell'
import KpiCard from './KpiCard'
import LoadBar from './LoadBar'
import HandoffForm from './HandoffForm'
import HandoffCard from './HandoffCard'
import AcceptHandoffModal from './AcceptHandoffModal'
import { useStore } from '@/hooks/useStore'
import {
  archiveMonthKey,
  formatArchiveMonth,
  isHandoffActive,
} from '@/lib/handoff'
import type { Handoff } from '@/lib/types'
import { formatRub, handoffTotal } from '@/lib/money'

export default function ContractorView() {
  const params = useParams()
  const id = String(params.id ?? '')
  const { store, loading, error, saving, save } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editingHandoff, setEditingHandoff] = useState<Handoff | null>(null)
  const [loadDraft, setLoadDraft] = useState<number | null>(null)
  const [acceptingHandoff, setAcceptingHandoff] = useState<Handoff | null>(null)
  const [acceptSubmitting, setAcceptSubmitting] = useState(false)
  const [archiveMonth, setArchiveMonth] = useState<string>('all')

  const contractor = store?.contractors.find(c => c.id === id)

  const { activeHandoffs, archivedHandoffs } = useMemo(() => {
    const all = (store?.handoffs ?? []).filter(h => h.contractorId === id)
    const active = all
      .filter(isHandoffActive)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const archived = all
      .filter(h => !isHandoffActive(h))
      .sort(
        (a, b) =>
          new Date(b.acceptedAt ?? 0).getTime() - new Date(a.acceptedAt ?? 0).getTime(),
      )
    return { activeHandoffs: active, archivedHandoffs: archived }
  }, [store, id])

  const archiveMonths = useMemo(() => {
    const keys = new Set<string>()
    for (const h of archivedHandoffs) {
      if (h.acceptedAt) keys.add(archiveMonthKey(h.acceptedAt))
    }
    return [...keys].sort((a, b) => b.localeCompare(a))
  }, [archivedHandoffs])

  const filteredArchive = useMemo(() => {
    if (archiveMonth === 'all') return archivedHandoffs
    return archivedHandoffs.filter(
      h => h.acceptedAt && archiveMonthKey(h.acceptedAt) === archiveMonth,
    )
  }, [archivedHandoffs, archiveMonth])

  useEffect(() => {
    if (archiveMonth !== 'all' && !archiveMonths.includes(archiveMonth)) {
      setArchiveMonth('all')
    }
  }, [archiveMonth, archiveMonths])

  const openCreate = () => {
    setEditingHandoff(null)
    setFormOpen(true)
  }

  const openEdit = (h: Handoff) => {
    setEditingHandoff(h)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingHandoff(null)
  }

  if (loading) {
    return (
      <AppShell title="ПРОИЗВОДСТВО">
        <div className="flex items-center gap-2 py-12 text-[#C8C8C8]">
          <span className="spinner" />
          <span>Загрузка…</span>
        </div>
      </AppShell>
    )
  }

  if (error || !store || !contractor) {
    return (
      <AppShell title="ПРОИЗВОДСТВО">
        <p className="text-[#F87171]">{error ?? 'Производство не найдено'}</p>
        <Link href="/" className="btn-ghost mt-4 inline-block">
          На главную
        </Link>
      </AppShell>
    )
  }

  const totalRub = activeHandoffs.reduce((s, h) => s + handoffTotal(h), 0)
  const loadValue = loadDraft ?? contractor.loadPercent

  const persistLoad = async (pct: number) => {
    const next = {
      ...store,
      contractors: store.contractors.map(c =>
        c.id === id ? { ...c, loadPercent: pct } : c,
      ),
    }
    await save(next)
    setLoadDraft(null)
  }

  const confirmAccept = async (acceptedByProductId: Record<number, number>) => {
    if (!acceptingHandoff) return
    setAcceptSubmitting(true)
    try {
      await save({
        ...store,
        handoffs: store.handoffs.map(h => {
          if (h.id !== acceptingHandoff.id) return h
          return {
            ...h,
            acceptedAt: new Date().toISOString(),
            items: h.items.map(line => ({
              ...line,
              acceptedQuantity: acceptedByProductId[line.product.id] ?? line.quantity,
            })),
          }
        }),
      })
      setAcceptingHandoff(null)
    } finally {
      setAcceptSubmitting(false)
    }
  }

  return (
    <AppShell
      title={contractor.name}
      actions={
        <button type="button" className="btn-primary" onClick={openCreate}>
          + Отдача
        </button>
      }
    >
      <div className="card mb-6 p-4">
        <LoadBar
          value={loadValue}
          label="Загрузка производства"
          onChange={n => setLoadDraft(n)}
        />
        {loadDraft !== null && loadDraft !== contractor.loadPercent && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={() => persistLoad(loadDraft)}
            >
              Сохранить загрузку
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setLoadDraft(null)}
            >
              Отмена
            </button>
          </div>
        )}
      </div>

      <div className="dashboard-kpi-grid">
        <KpiCard label="Сумма, ₽" value={formatRub(totalRub)} />
        <KpiCard label="В работе" value={activeHandoffs.length} />
        <KpiCard label="В архиве" value={archivedHandoffs.length} />
      </div>

      {activeHandoffs.length === 0 ? (
        <div className="card mb-8 p-6 text-center text-[#C8C8C8]">
          Нет активных отдач. Нажмите «+ Отдача».
        </div>
      ) : (
        <div className="dashboard-drops-list mb-8">
          {activeHandoffs.map(h => (
            <HandoffCard
              key={h.id}
              handoff={h}
              materials={store.materials}
              onEdit={() => openEdit(h)}
              onAccept={() => setAcceptingHandoff(h)}
              accepting={acceptSubmitting && acceptingHandoff?.id === h.id}
            />
          ))}
        </div>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#9AA8A3]">
            Архив
          </h2>
          {archiveMonths.length > 0 && (
            <div>
              <p className="label-caps mb-1.5">Месяц</p>
              <select
                value={archiveMonth}
                onChange={e => setArchiveMonth(e.target.value)}
                className="input-field min-w-[180px]"
              >
                <option value="all">Все ({archivedHandoffs.length})</option>
                {archiveMonths.map(key => {
                  const count = archivedHandoffs.filter(
                    h => h.acceptedAt && archiveMonthKey(h.acceptedAt) === key,
                  ).length
                  return (
                    <option key={key} value={key}>
                      {formatArchiveMonth(key)} ({count})
                    </option>
                  )
                })}
              </select>
            </div>
          )}
        </div>
        {archivedHandoffs.length === 0 ? (
          <p className="text-sm text-[#9AA8A3]">Принятых отдач пока нет</p>
        ) : filteredArchive.length === 0 ? (
          <p className="text-sm text-[#9AA8A3]">Нет отдач за выбранный месяц</p>
        ) : (
          <div className="dashboard-drops-list">
            {filteredArchive.map(h => (
              <HandoffCard
                key={h.id}
                handoff={h}
                materials={store.materials}
                archived
              />
            ))}
          </div>
        )}
      </section>

      <AcceptHandoffModal
        handoff={acceptingHandoff}
        open={Boolean(acceptingHandoff)}
        onClose={() => setAcceptingHandoff(null)}
        onConfirm={confirmAccept}
        submitting={acceptSubmitting}
      />

      <HandoffForm
        open={formOpen}
        onClose={closeForm}
        contractorId={id}
        store={store}
        onSave={save}
        editing={editingHandoff}
      />
    </AppShell>
  )
}
