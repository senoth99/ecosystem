import { NextResponse } from 'next/server'

const CATALOG_BASE = (process.env.CATALOG_SERVICE_URL ?? 'https://api.cashercollection.com').replace(
  /\/$/,
  '',
)
const PRODUCTS_URL = `${CATALOG_BASE}/products`

export async function GET() {
  try {
    const res = await fetch(PRODUCTS_URL, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream ${res.status}` },
        { status: res.status },
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Fetch failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
