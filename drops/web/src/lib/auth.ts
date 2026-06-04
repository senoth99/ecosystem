import { cookies } from 'next/headers'

const COOKIE = 'drops_auth'

export async function isAuthenticated() {
  const store = await cookies()
  return store.get(COOKIE)?.value === '1'
}

export async function setAuthCookie() {
  const store = await cookies()
  store.set(COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearAuthCookie() {
  const store = await cookies()
  store.delete(COOKIE)
}

/** Сравнение с trim: в .env часто оказывается CRLF → "1234\r" и вход "1234" не совпадал. */
export function checkPassword(password: string) {
  const expected =
    typeof process.env.APP_PASSWORD === 'string' && process.env.APP_PASSWORD.trim() !== ''
      ? process.env.APP_PASSWORD.trim()
      : '1234'
  return password.trim() === expected
}
