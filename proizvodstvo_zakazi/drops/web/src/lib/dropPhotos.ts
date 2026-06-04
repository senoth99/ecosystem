import { mkdir, readFile, unlink, writeFile } from 'fs/promises'
import path from 'path'
import { revalidatePath } from 'next/cache'
import { ALLOWED_EXT, mimeFor } from '@/lib/itemPhotos'

export const DROP_UPLOAD_ROOT = path.join(process.cwd(), 'data', 'uploads', 'drops')

export function revalidateDropPaths(dropId: string) {
  revalidatePath('/')
  revalidatePath('/archive')
  revalidatePath(`/drops/${dropId}`)
}

export async function removeDropPhotoFile(dropId: string, filename: string | null) {
  if (!filename) return
  try {
    await unlink(path.join(DROP_UPLOAD_ROOT, dropId, filename))
  } catch {
    /* ignore */
  }
}

export async function readDropPhotoFile(dropId: string, filename: string) {
  return readFile(path.join(DROP_UPLOAD_ROOT, dropId, filename))
}

export async function saveDropPhotoUpload(dropId: string, file: File) {
  if (file.size === 0) return { error: 'no file' as const, status: 400 }
  if (file.size > 5 * 1024 * 1024) return { error: 'too large' as const, status: 400 }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  if (!ALLOWED_EXT.has(ext)) return { error: 'bad type' as const, status: 400 }

  const filename = `mockup.${ext}`
  const dir = path.join(DROP_UPLOAD_ROOT, dropId)
  await mkdir(dir, { recursive: true })

  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, filename), buf)
  return { filename, ext }
}

export { mimeFor }
