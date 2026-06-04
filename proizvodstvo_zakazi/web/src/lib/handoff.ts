import type { Handoff } from './types'

export function isHandoffActive(h: Handoff) {
  return !h.acceptedAt
}

export function formatHandoffDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** YYYY-MM по дате принятия */
export function archiveMonthKey(acceptedAt: string) {
  const d = new Date(acceptedAt)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function formatArchiveMonth(key: string) {
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  return new Date(y, m - 1, 1).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  })
}

export function deadlineStatus(deadline: string | null, acceptedAt: string | null) {
  if (!deadline || acceptedAt) return 'ok' as const
  const end = new Date(deadline)
  end.setHours(23, 59, 59, 999)
  if (end.getTime() < Date.now()) return 'overdue' as const
  const days = (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (days <= 3) return 'soon' as const
  return 'ok' as const
}
