import { NextResponse } from 'next/server'
import { readStore, writeStore } from '@/lib/store-server'
import type { Store } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const store = await readStore()
    return NextResponse.json(store)
  } catch (e) {
    console.error('[api/store GET]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Read failed' },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  let body: Store
  try {
    body = (await request.json()) as Store
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  try {
    const store: Store = {
      contractors: Array.isArray(body.contractors) ? body.contractors : [],
      materials: Array.isArray(body.materials) ? body.materials : [],
      handoffs: Array.isArray(body.handoffs) ? body.handoffs : [],
    }
    await writeStore(store)
    const saved = await readStore()
    return NextResponse.json(saved)
  } catch (e) {
    console.error('[api/store PUT]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Write failed' },
      { status: 500 },
    )
  }
}
