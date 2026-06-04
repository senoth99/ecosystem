'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDropPhotoUrl } from '@/lib/drops'
import { colors } from '@/lib/theme'
import PhotoDropZone from './PhotoDropZone'

export function DropMockupThumb({
  dropId,
  photo,
  size = 88,
  onClick,
}: {
  dropId: string
  photo?: string | null
  size?: number
  onClick?: () => void
}) {
  const url = getDropPhotoUrl(dropId, photo)
  const style = {
    width: size,
    height: size,
    flexShrink: 0,
    border: `1px solid ${colors.border}`,
    background: colors.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden' as const,
    cursor: onClick ? 'pointer' : 'default',
  }

  if (!url) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? e => e.key === 'Enter' && onClick() : undefined}
        style={{ ...style, color: colors.muted, fontSize: 10, letterSpacing: '0.06em', textAlign: 'center', padding: 4 }}
      >
        + МОКАП
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      onClick={onClick}
      style={{ ...style, objectFit: 'cover', padding: 0 }}
    />
  )
}

export default function DropMockupEditor({
  dropId,
  photo,
  compact = false,
}: {
  dropId: string
  photo?: string | null
  compact?: boolean
}) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(files: FileList) {
    setUploading(true)
    setError(null)
    try {
      const file = files[0]
      if (!file) return
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/drops/${dropId}/photo`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error('upload')
      router.refresh()
    } catch {
      setError('Не удалось загрузить мокап.')
    } finally {
      setUploading(false)
    }
  }

  async function remove() {
    setUploading(true)
    setError(null)
    try {
      const res = await fetch(`/api/drops/${dropId}/photo`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete')
      router.refresh()
    } catch {
      setError('Не удалось удалить мокап.')
    } finally {
      setUploading(false)
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <DropMockupThumb dropId={dropId} photo={photo} size={72} />
        <PhotoDropZone
          onFiles={upload}
          uploading={uploading}
          emptyLabel=""
          className="photo-drop-zone--inline min-h-0 flex-1 border-0 p-0"
        >
          <div className="flex flex-wrap gap-2">
            <span className="text-[11px] text-[#C8C8C8]">Перетащи или Ctrl+V</span>
            {photo && (
              <button type="button" className="btn-ghost text-[10px] text-[#C8C8C8]" disabled={uploading} onClick={remove}>
                УБРАТЬ
              </button>
            )}
          </div>
        </PhotoDropZone>
        {error && <p className="text-[11px] text-[#F0B429]">{error}</p>}
      </div>
    )
  }

  return (
    <div className="card p-5">
      <p className="label-caps mb-4 text-[#14C97A]">Мокап дропа</p>
      <div className="flex flex-wrap gap-4">
        <DropMockupThumb dropId={dropId} photo={photo} size={160} />
        <div className="min-w-[200px] flex-1">
          <PhotoDropZone onFiles={upload} uploading={uploading} className="min-h-[120px]">
            <div className="photo-drop-zone__empty py-6">
              <p className="text-[12px] text-[#C8C8C8]">
                {uploading ? 'Загрузка...' : 'Скриншот, файл или вставка из буфера'}
              </p>
            </div>
          </PhotoDropZone>
          {photo && (
            <button type="button" className="btn-ghost mt-2 text-[10px] text-[#C8C8C8]" disabled={uploading} onClick={remove}>
              УБРАТЬ МОКАП
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-3 text-[11px] text-[#F0B429]">{error}</p>}
    </div>
  )
}
