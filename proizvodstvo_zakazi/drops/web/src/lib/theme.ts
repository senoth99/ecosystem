export const colors = {
  bg: '#050505',
  surface: '#1A1F1C',
  card: '#1A1F1C',
  border: '#3D5248',
  accent: '#0E7A45',
  accentBright: '#14C97A',
  text: '#FFFFFF',
  muted: '#C8C8C8',
  mutedDark: '#9AA8A3',
  error: '#F87171',
  warn: '#F0B429',
  orange: '#FB923C',
} as const

export const STAGE_DONE_COLOR = '#0E9A56'
export const STAGE_ACTIVE_COLOR = '#14C97A'
export const STAGE_UPCOMING_COLOR = '#3A5248'

export function btnOutlineLockedClass(locked: boolean) {
  return locked ? 'opacity-[0.42] cursor-not-allowed border-[#3D5248] bg-[#1A1F1C] text-[#6B7A74] grayscale-[0.25]' : ''
}
