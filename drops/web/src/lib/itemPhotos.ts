import { mkdir, readFile, unlink, writeFile } from 'fs/promises'
import path from 'path'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'

/** Вне public/: при standalone next start не отдаёт файлы, залитые после build. */
export const UPLOAD_ROOT = path.join(process.cwd(), 'data', 'uploads', 'items')

export const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

export const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

export function mimeFor(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpeg'
  return MIME[ext] ?? 'application/octet-stream'
}

export function photoServeUrl(itemId: string, photoId: string) {
  return `/api/items/${itemId}/photos/${photoId}`
}

export async function removePhotoFile(itemId: string, filename: string | null) {
  if (!filename) return
  try {
    await unlink(path.join(UPLOAD_ROOT, itemId, filename))
  } catch {
    /* ignore */
  }
}

export function revalidateItemPaths(dropId: string | null | undefined, itemId: string) {
  revalidatePath('/products')
  if (dropId) {
    revalidatePath(`/drops/${dropId}`)
    revalidatePath(`/drops/${dropId}/items/${itemId}`)
  }
}

export async function deleteAllItemPhotos(itemId: string) {
  const photos = await prisma.itemPhoto.findMany({ where: { itemId } })
  await Promise.all(photos.map(p => removePhotoFile(itemId, p.filename)))
  await prisma.itemPhoto.deleteMany({ where: { itemId } })

  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { photo: true } })
  if (item?.photo) {
    await removePhotoFile(itemId, item.photo)
    await prisma.item.update({ where: { id: itemId }, data: { photo: null } })
  }
}

export async function getFirstPhoto(itemId: string) {
  const photo = await prisma.itemPhoto.findFirst({
    where: { itemId },
    orderBy: { createdAt: 'asc' },
  })
  if (photo) return photo

  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { photo: true } })
  if (!item?.photo) return null
  return { id: 'legacy', filename: item.photo, originalName: item.photo }
}

export async function saveItemPhotoUpload(itemId: string, file: File) {
  if (file.size === 0) return { error: 'no file' as const, status: 400 }
  if (file.size > 5 * 1024 * 1024) return { error: 'too large' as const, status: 400 }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  if (!ALLOWED_EXT.has(ext)) return { error: 'bad type' as const, status: 400 }

  const filename = `${crypto.randomUUID()}.${ext}`
  const dir = path.join(UPLOAD_ROOT, itemId)
  await mkdir(dir, { recursive: true })

  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, filename), buf)

  const record = await prisma.itemPhoto.create({
    data: {
      itemId,
      filename,
      originalName: file.name || filename,
    },
  })

  return { record, ext }
}

export async function readPhotoFile(itemId: string, filename: string) {
  return readFile(path.join(UPLOAD_ROOT, itemId, filename))
}
