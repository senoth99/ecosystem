'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setLoading(false)
    if (!res.ok) {
      setError(true)
      setShake(true)
      setPassword('')
      setTimeout(() => setShake(false), 500)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ animation: shake ? 'shakeX 0.4s ease' : 'none' }}>
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(false) }}
          autoFocus
          className={`login-password-input w-full ${error ? 'border-[#F87171]' : ''}`}
        />
        {error && <p className="mt-2 text-center text-xs text-[#14C97A]">Неверный пароль</p>}
      </div>
      <button type="submit" disabled={loading} className="btn-outline mt-4 w-full">
        {loading ? '...' : 'ВОЙТИ'}
      </button>
    </form>
  )
}
