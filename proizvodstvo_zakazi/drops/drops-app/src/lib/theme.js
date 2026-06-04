export const colors = {
  bg: '#050505',
  surface: '#1A1F1C',
  card: '#1A1F1C',
  border: '#3D5248',
  accent: '#0E7A45',
  accentDark: '#0B6B3E',
  accentBright: '#14C97A',
  text: '#FFFFFF',
  muted: '#C8C8C8',
  mutedDark: '#9AA8A3',
  error: '#F87171',
  warn: '#F0B429',
  orange: '#FB923C',
}

export const labelCaps = {
  fontSize: '10px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: colors.mutedDark,
}

export const btnOutline = {
  padding: '8px 16px',
  background: '#0E7A45',
  border: '1px solid #14C97A',
  color: '#FFFFFF',
  cursor: 'pointer',
  fontSize: '11px',
  letterSpacing: '0.1em',
  fontWeight: 600,
  fontFamily: 'inherit',
}

export const btnGhost = {
  padding: '7px 14px',
  background: '#1A1F1C',
  border: '1px solid #3D5248',
  color: '#E8E8E8',
  cursor: 'pointer',
  fontSize: '11px',
  letterSpacing: '0.08em',
  fontFamily: 'inherit',
}

/** Стиль основной кнопки действия, когда переход недоступен (задачи этапа не закрыты). */
export function btnOutlineLockedStyle(locked) {
  if (!locked) return {}
  return {
    opacity: 0.42,
    cursor: 'not-allowed',
    borderColor: colors.border,
    color: colors.muted,
    background: colors.surface,
    filter: 'grayscale(0.25)',
  }
}
