import { NextResponse } from 'next/server'
import { checkPassword } from '@/lib/auth'

export async function POST(request: Request) {
  const { password } = await request.json()
  if (!checkPassword(password)) {
    return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set('drops_auth', '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
