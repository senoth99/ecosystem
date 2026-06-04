'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getItemPhotoUrl } from '@/lib/items'
import { toggleItemSampleAction } from '@/app/actions'
import { colors } from '@/lib/theme'

type ItemRow = {
  id: string
  dropId?: string | null
  photo?: string | null
  photos?: { id: string }[]
  samplePrinted?: boolean
}

function thumbStyle(size: number, clickable: boolean) {
  return {
    width: size,
    height: size,
    flexShrink: 0,
    border: `1px solid ${colors.border}`,
    background: colors.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden' as const,
    cursor: clickable ? 'pointer' : 'default',
  }
}

export function ItemPhotoThumb({
  item,
  size = 80,
  onClick,
}: {
  item: ItemRow
  size?: number
  onClick?: () => void
}) {
  const url = getItemPhotoUrl(item)
  if (!url) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? e => e.key === 'Enter' && onClick() : undefined}
        style={{
          ...thumbStyle(size, !!onClick),
          color: colors.muted,
          fontSize: 11,
          letterSpacing: '0.08em',
          textAlign: 'center',
          padding: 4,
        }}
      >
        + ФОТО
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      onClick={onClick}
      style={{ ...thumbStyle(size, !!onClick), objectFit: 'cover', padding: 0 }}
    />
  )
}

export default function ItemMeta({
  item,
  compact = false,
  embedded = false,
}: {
  item: ItemRow
  compact?: boolean
  embedded?: boolean
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [togglingSample, setTogglingSample] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setError(null)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch(`/api/items/${item.id}/photos`, { method: 'POST', body: fd })
        if (!res.ok) throw new Error('upload')
      }
      router.refresh()
    } catch {
      setError('Не удалось загрузить фото.')
    } finally {
      setUploading(false)
    }
  }

  async function handleToggleSample() {
    setTogglingSample(true)
    setError(null)
    try {
      await toggleItemSampleAction(item.id, item.dropId ?? null, !item.samplePrinted)
      router.refresh()
    } catch {
      setError('Не удалось сохранить статус семпла.')
    } finally {
      setTogglingSample(false)
    }
  }

  if (compact) return <ItemPhotoThumb item={item} size={48} />

  const photoSize = embedded ? 188 : 80

  return (
    <div className={embedded ? undefined : 'card'} style={embedded ? { marginTop: 4 } : { padding: 20, marginBottom: 20 }}>
      {!embedded && (
        <p className="label-caps mb-4" style={{ color: colors.accentBright }}>
          Фото и семпл
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={e => {
          uploadFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <div className={embedded ? 'item-meta-embedded' : 'item-meta-grid item-meta-grid--standalone'}>
        {embedded ? (
          <>
            <div className="item-meta-embedded__preview">
              <p className="label-caps" style={{ color: colors.accentBright, marginBottom: 0 }}>Фото</p>
              <div
                className="photo-drop-zone photo-drop-zone--thumb"
                tabIndex={0}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  uploadFiles(e.dataTransfer.files)
                }}
                onPaste={e => uploadFiles(e.clipboardData.files)}
              >
                <ItemPhotoThumb
                  item={item}
                  size={photoSize}
                  onClick={() => !uploading && fileRef.current?.click()}
                />
              </div>
            </div>
            <div className="item-meta-embedded__controls">
              <div className="item-meta-embedded__photo-actions flex flex-col gap-2">
                <button
                  type="button"
                  className="btn-ghost w-full text-[10px]"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? 'ЗАГРУЗКА...' : '+ ДОБАВИТЬ ФОТО'}
                </button>
                <p className="text-[10px] text-[#8A9A92]">или перетащи / Ctrl+V на превью</p>
                <Link href={`/products/${item.id}`} className="btn-outline w-full text-center text-[10px]">
                  ФОТО, ЗАМЕТКИ, ЗАДАЧИ →
                </Link>
              </div>
              <div>
                <p className="label-caps mb-2" style={{ color: colors.accentBright }}>Семпл</p>
                <button
                  type="button"
                  className={`w-full border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider ${
                    item.samplePrinted
                      ? 'border-[#14C97A] bg-[#0E7A45] text-[#050505]'
                      : 'border-[#14C97A] bg-transparent text-[#14C97A]'
                  }`}
                  disabled={togglingSample}
                  onClick={handleToggleSample}
                >
                  {togglingSample ? 'СОХРАНЕНИЕ...' : item.samplePrinted ? '✓ СЕМПЛ ОТПЕЧАТАН' : 'ОТМЕТИТЬ: СЕМПЛ ОТПЕЧАТАН'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="label-caps mb-2" style={{ color: colors.accentBright }}>Фото</p>
              <ItemPhotoThumb item={item} size={photoSize} onClick={() => !uploading && fileRef.current?.click()} />
              <div className="mt-2 flex flex-col gap-1.5">
                <button type="button" className="btn-ghost w-full text-[10px]" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? 'ЗАГРУЗКА...' : '+ ДОБАВИТЬ ФОТО'}
                </button>
                <Link href={`/products/${item.id}`} className="btn-ghost w-full text-center text-[10px]">
                  ВСЕ ФОТО В КАТАЛОГЕ
                </Link>
              </div>
            </div>
            <div>
              <p className="label-caps mb-2" style={{ color: colors.accentBright }}>Семпл</p>
              <button
                type="button"
                className={`w-full border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider ${
                  item.samplePrinted
                    ? 'border-[#14C97A] bg-[#0E7A45] text-[#050505]'
                    : 'border-[#14C97A] bg-transparent text-[#14C97A]'
                }`}
                disabled={togglingSample}
                onClick={handleToggleSample}
              >
                {togglingSample ? 'СОХРАНЕНИЕ...' : item.samplePrinted ? '✓ СЕМПЛ ОТПЕЧАТАН' : 'ОТМЕТИТЬ: СЕМПЛ ОТПЕЧАТАН'}
              </button>
            </div>
          </>
        )}
      </div>

      {error && <p className="mt-3 text-[11px] leading-snug text-[#F0B429]">{error}</p>}
    </div>
  )
}
