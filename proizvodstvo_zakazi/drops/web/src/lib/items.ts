export type ItemPhotoFields = {
  id: string
  photo?: string | null
  photos?: { id: string }[]
}

export function getItemPhotoDownloadUrl(itemId: string, photoId: string): string {
  return `/api/items/${itemId}/photos/${photoId}`
}

export function getItemPhotoUrl(item: ItemPhotoFields): string | null {
  const first = item.photos?.[0]
  if (first) return getItemPhotoDownloadUrl(item.id, first.id)
  if (item.photo) return `/api/items/${item.id}/photo`
  return null
}
