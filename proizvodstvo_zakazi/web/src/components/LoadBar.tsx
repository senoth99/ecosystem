'use client'

import { colors } from '@/lib/theme'

export default function LoadBar({
  value,
  onChange,
  label,
}: {
  value: number
  onChange?: (n: number) => void
  label?: string
}) {
  const pct = Math.min(100, Math.max(0, value))

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex justify-between gap-2">
          <span className="label-caps">{label}</span>
          <span className="text-sm font-semibold text-white">{pct}%</span>
        </div>
      )}
      <div
        className="h-2 w-full border border-[#3D5248]"
        style={{ background: colors.bg }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full transition-all duration-200"
          style={{
            width: `${pct}%`,
            background: pct >= 90 ? colors.warn : colors.accentBright,
          }}
        />
      </div>
      {onChange && (
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={e => onChange(Number(e.target.value))}
          className="mt-2 w-full accent-[#14C97A]"
          aria-label={label ?? 'Загрузка'}
        />
      )}
    </div>
  )
}
