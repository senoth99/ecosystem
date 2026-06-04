import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  mimeFor,
  revalidateItemPaths,
  removePhotoFile,
  readPhotoFile,
} from '@/lib/itemPhotos'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string; photoId: string }> },
) {
  const { itemId, photoId } = await params
  const photo = await prisma.itemPhoto.findFirst({
    where: { id: photoId, itemId },
  })
  if (!photo) return new NextResponse(null, { status: 404 })

  try {
    const buf = await readPhotoFile(itemId, photo.filename)
    const download = request.nextUrl.searchParams.get('download') === '1'
    const name = photo.originalName ?? photo.filename
    const headers: Record<string, string> = {
      'Content-Type': mimeFor(photo.filename),
      'Cache-Control': 'private, max-age=3600',
    }
    if (download) {
      headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(name)}"`
    }
    return new NextResponse(buf, { headers })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string; photoId: string }> },
) {
  const { itemId, photoId } = await params
  const photo = await prisma.itemPhoto.findFirst({
    where: { id: photoId, itemId },
    include: { item: { select: { dropId: true } } },
  })
  if (!photo) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await removePhotoFile(itemId, photo.filename)
  await prisma.itemPhoto.delete({ where: { id: photoId } })
  revalidateItemPaths(photo.item.dropId, itemId)

  return NextResponse.json({ ok: true })
}
