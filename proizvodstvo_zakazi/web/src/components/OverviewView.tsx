'use client'

import Link from 'next/link'
import AppShell from './AppShell'
import LoadBar from './LoadBar'
import { useStore } from '@/hooks/useStore'
import { isHandoffActive } from '@/lib/handoff'
import { handoffTotal, formatRub } from '@/lib/money'

export default function OverviewView() {
  const { store, loading, error } = useStore()

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

  if (error || !store) {
    return (
      <AppShell title="ПРОИЗВОДСТВО">
        <p className="text-[#F87171]">{error ?? 'Нет данных'}</p>
      </AppShell>
    )
  }

  const contractorStats = store.contractors.map(c => {
    const items = store.handoffs.filter(h => h.contractorId === c.id && isHandoffActive(h))
    const sum = items.reduce((s, h) => s + handoffTotal(h), 0)
    return { contractor: c, handoffCount: items.length, sum }
  })

  return (
    <AppShell title="ПРОИЗВОДСТВО">
      {store.contractors.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-[#C8C8C8]">Нет производств. Добавьте в разделе «Справочники».</p>
          <Link href="/catalog" className="btn-primary mt-4 inline-block">
            Справочники
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contractorStats.map(({ contractor, handoffCount, sum }) => (
            <Link
              key={contractor.id}
              href={`/contractors/${contractor.id}`}
              className="card block p-4 no-underline"
            >
              <div className="drop-row__head mb-3">
                <h3 className="truncate text-[16px] font-semibold text-white">{contractor.name}</h3>
                <span className="label-caps shrink-0">{handoffCount} отдач</span>
              </div>
              <LoadBar value={contractor.loadPercent} label="Загрузка" />
              <p className="mt-3 text-sm">
                <span className="label-caps">Сумма </span>
                <span className="font-semibold text-white">{formatRub(sum)}</span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  )
}
