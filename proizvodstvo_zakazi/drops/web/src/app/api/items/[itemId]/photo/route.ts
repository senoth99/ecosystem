import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  getFirstPhoto,
  mimeFor,
  photoServeUrl,
  revalidateItemPaths,
  removePhotoFile,
  readPhotoFile,
  saveItemPhotoUpload,
} from '@/lib/itemPhotos'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params
  const first = await getFirstPhoto(itemId)
  if (!first) return new NextResponse(null, { status: 404 })

  if (first.id !== 'legacy') {
    return NextResponse.redirect(new URL(photoServeUrl(itemId, first.id), _request.url), 302)
  }

  try {
    const buf = await readPhotoFile(itemId, first.filename)
    return new NextResponse(buf, {
      headers: {
        'Content-Type': mimeFor(first.filename),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params
  const item = await prisma.item.findUnique({ where: { id: itemId } })
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no file' }, { status: 400 })
  }

  const result = await saveItemPhotoUpload(itemId, file)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  await prisma.item.update({
    where: { id: itemId },
    data: { photo: result.record.filename },
  })

  revalidateItemPaths(item.dropId, itemId)

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params
  const item = await prisma.item.findUnique({ where: { id: itemId } })
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const first = await prisma.itemPhoto.findFirst({
    where: { itemId },
    orderBy: { createdAt: 'asc' },
  })

  if (first) {
    await removePhotoFile(itemId, first.filename)
    await prisma.itemPhoto.delete({ where: { id: first.id } })
    const remaining = await prisma.itemPhoto.findFirst({
      where: { itemId },
      orderBy: { createdAt: 'asc' },
    })
    await prisma.item.update({
      where: { id: itemId },
      data: { photo: remaining?.filename ?? null },
    })
  } else if (item.photo) {
    await removePhotoFile(itemId, item.photo)
    await prisma.item.update({ where: { id: itemId }, data: { photo: null } })
  }

  revalidateItemPaths(item.dropId, itemId)

  return NextResponse.json({ ok: true })
}
