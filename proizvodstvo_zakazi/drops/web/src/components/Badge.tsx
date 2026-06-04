export default function Badge({ label, color = '#0A5C34', small = false }: { label: string; color?: string; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 border bg-[#1A1F1C] font-semibold uppercase tracking-wide ${small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'}`}
      style={{ borderColor: color, color }}
    >
      <span style={{ width: small ? 5 : 6, height: small ? 5 : 6, background: color }} />
      {label}
    </span>
  )
}
