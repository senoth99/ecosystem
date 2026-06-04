import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  photoServeUrl,
  revalidateItemPaths,
  saveItemPhotoUpload,
} from '@/lib/itemPhotos'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params
  const item = await prisma.item.findUnique({ where: { id: itemId } })
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const photos = await prisma.itemPhoto.findMany({
    where: { itemId },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(
    photos.map(p => ({
      id: p.id,
      originalName: p.originalName,
      url: photoServeUrl(itemId, p.id),
    })),
  )
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

  revalidateItemPaths(item.dropId, itemId)

  return NextResponse.json({
    id: result.record.id,
    originalName: result.record.originalName,
    url: photoServeUrl(itemId, result.record.id),
  })
}
