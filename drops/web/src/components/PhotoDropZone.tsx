'use client'

import { useCallback, useRef, useState } from 'react'
import { colors } from '@/lib/theme'

export default function PhotoDropZone({
  onFiles,
  uploading = false,
  emptyLabel = 'Перетащи скриншот сюда или вставь (Ctrl+V)',
  className = '',
  children,
}: {
  onFiles: (files: FileList) => void
  uploading?: boolean
  emptyLabel?: string
  className?: string
  children?: React.ReactNode
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const pickFiles = useCallback(
    (files: FileList | null | undefined) => {
      if (!files?.length || uploading) return
      const images = Array.from(files).filter(f => f.type.startsWith('image/'))
      if (!images.length) return
      const dt = new DataTransfer()
      images.forEach(f => dt.items.add(f))
      onFiles(dt.files)
    },
    [onFiles, uploading],
  )

  return (
    <div
      ref={zoneRef}
      tabIndex={0}
      role="region"
      aria-label="Зона загрузки фото"
      className={`photo-drop-zone ${dragOver ? 'photo-drop-zone--active' : ''} ${className}`}
      onDragEnter={e => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragOver={e => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={e => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return
        setDragOver(false)
      }}
      onDrop={e => {
        e.preventDefault()
        setDragOver(false)
        pickFiles(e.dataTransfer.files)
      }}
      onPaste={e => {
        pickFiles(e.clipboardData.files)
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={e => {
          pickFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {children ?? (
        <div className="photo-drop-zone__empty">
          <p className="text-[12px] text-[#C8C8C8]">{uploading ? 'Загрузка...' : emptyLabel}</p>
          <button
            type="button"
            className="btn-ghost mt-2 text-[10px]"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            ВЫБРАТЬ ФАЙЛ
          </button>
        </div>
      )}
      {dragOver && !uploading && (
        <div
          className="photo-drop-zone__overlay"
          style={{ borderColor: colors.accent }}
        >
          <span className="label-caps text-[#14C97A]">Отпусти для загрузки</span>
        </div>
      )}
    </div>
  )
}
