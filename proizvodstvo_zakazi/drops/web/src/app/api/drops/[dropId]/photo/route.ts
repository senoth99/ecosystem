import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  mimeFor,
  revalidateDropPaths,
  removeDropPhotoFile,
  readDropPhotoFile,
  saveDropPhotoUpload,
} from '@/lib/dropPhotos'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ dropId: string }> },
) {
  const { dropId } = await params
  const drop = await prisma.drop.findUnique({ where: { id: dropId } })
  if (!drop?.photo) return new NextResponse(null, { status: 404 })

  try {
    const buf = await readDropPhotoFile(dropId, drop.photo)
    return new NextResponse(buf, {
      headers: {
        'Content-Type': mimeFor(drop.photo),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dropId: string }> },
) {
  const { dropId } = await params
  const drop = await prisma.drop.findUnique({ where: { id: dropId } })
  if (!drop) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no file' }, { status: 400 })
  }

  const saved = await saveDropPhotoUpload(dropId, file)
  if ('error' in saved) {
    return NextResponse.json({ error: saved.error }, { status: saved.status })
  }

  await removeDropPhotoFile(dropId, drop.photo)
  await prisma.drop.update({ where: { id: dropId }, data: { photo: saved.filename } })
  revalidateDropPaths(dropId)
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ dropId: string }> },
) {
  const { dropId } = await params
  const drop = await prisma.drop.findUnique({ where: { id: dropId } })
  if (!drop) return NextResponse.json({ error: 'not found' }, { status: 404 })

  await removeDropPhotoFile(dropId, drop.photo)
  await prisma.drop.update({ where: { id: dropId }, data: { photo: null } })
  revalidateDropPaths(dropId)
  return NextResponse.json({ ok: true })
}
