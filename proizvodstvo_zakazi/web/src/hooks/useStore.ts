'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Store } from '@/lib/types'

export function useStore() {
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/store', { cache: 'no-store' })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(
          typeof errBody.error === 'string' ? errBody.error : 'Не удалось загрузить данные',
        )
      }
      setStore((await res.json()) as Store)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const save = useCallback(async (next: Store) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!res.ok) throw new Error('Не удалось сохранить')
      const saved = (await res.json()) as Store
      setStore(saved)
      return saved
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения')
      throw e
    } finally {
      setSaving(false)
    }
  }, [])

  return { store, setStore, loading, error, saving, save, refresh }
}
