export function getDropPhotoUrl(dropId: string, photo?: string | null): string | null {
  if (!photo) return null
  return `/api/drops/${dropId}/photo`
}
