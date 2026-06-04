export default function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="kpi-card">
      <p className="label-caps">{label}</p>
      <p className="mt-2 text-[28px] font-semibold text-white">{value ?? '—'}</p>
    </div>
  )
}
