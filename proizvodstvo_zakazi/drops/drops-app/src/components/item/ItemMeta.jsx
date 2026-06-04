import { useRef, useState } from 'react'
import { getItemPhotoUrl, updateItemPhoto, toggleItemSample } from '../../lib/pocketbase'
import { colors, btnGhost, labelCaps } from '../../lib/theme'

const thumbBox = {
  flexShrink: 0,
  border: `1px solid ${colors.border}`,
  background: colors.bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}

const sampleBtnBase = {
  padding: '10px 16px',
  fontSize: '11px',
  letterSpacing: '0.1em',
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  border: `1px solid ${colors.accentBright}`,
  textAlign: 'center',
  whiteSpace: 'normal',
  lineHeight: 1.35,
  minHeight: '44px',
  boxSizing: 'border-box',
}

const sampleBtnWide = { ...sampleBtnBase, width: '100%' }

const sectionTitle = {
  ...labelCaps,
  marginBottom: '10px',
  color: colors.accentBright,
}

export function ItemPhotoThumb({ item, size = 80, onClick }) {
  const thumbParam = size <= 48 ? '80x80' : '200x200'
  const url = getItemPhotoUrl(item, thumbParam)
  const style = {
    ...thumbBox,
    width: size,
    height: size,
    cursor: onClick ? 'pointer' : 'default',
  }

  if (!url) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={onClick ? e => e.key === 'Enter' && onClick() : undefined}
        style={{ ...style, color: colors.muted, fontSize: '11px', letterSpacing: '0.08em', textAlign: 'center', padding: '4px' }}
      >
        + ФОТО
      </div>
    )
  }

  return (
    <img
      src={url}
      alt=""
      onClick={onClick}
      style={{ ...style, objectFit: 'cover', padding: 0, cursor: onClick ? 'pointer' : 'default' }}
    />
  )
}

export default function ItemMeta({ item, onUpdated, compact = false, embedded = false }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [togglingSample, setTogglingSample] = useState(false)
  const [error, setError] = useState(null)

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const { data, error: err } = await updateItemPhoto(item.id, file)
    setUploading(false)
    e.target.value = ''
    if (err) {
      setError('Не удалось загрузить фото. Перезапустите PocketBase с миграциями.')
      return
    }
    if (data) onUpdated?.(data)
  }

  async function handleRemovePhoto(e) {
    e.stopPropagation()
    setUploading(true)
    setError(null)
    const { data, error: err } = await updateItemPhoto(item.id, null)
    setUploading(false)
    if (err) {
      setError('Не удалось удалить фото.')
      return
    }
    if (data) onUpdated?.(data)
  }

  async function handleToggleSample() {
    setTogglingSample(true)
    setError(null)
    const next = !item.sample_printed
    const { data, error: err } = await toggleItemSample(item.id, next)
    setTogglingSample(false)
    if (err) {
      setError('Не удалось сохранить статус. Примените миграцию items (photo, sample_printed).')
      return
    }
    if (data) onUpdated?.(data)
  }

  if (compact) {
    return <ItemPhotoThumb item={item} size={48} />
  }

  const photoSize = embedded ? 188 : 80
  const wrapStyle = embedded
    ? { marginTop: '4px' }
    : { padding: '20px', marginBottom: '20px' }

  return (
    <div className={embedded ? undefined : 'card'} style={wrapStyle}>
      {!embedded && <p style={{ ...sectionTitle, marginBottom: '16px' }}>Фото и семпл</p>}

      <div className={embedded ? 'item-meta-embedded' : 'item-meta-grid item-meta-grid--standalone'}>
        {embedded ? (
          <>
            <div className="item-meta-embedded__preview">
              <p style={{ ...sectionTitle, marginBottom: 0 }}>Фото</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
              <ItemPhotoThumb
                item={item}
                size={photoSize}
                onClick={() => !uploading && fileRef.current?.click()}
              />
            </div>
            <div className="item-meta-embedded__controls">
              <div className="item-meta-embedded__photo-actions">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  style={{ ...btnGhost, fontSize: '10px', padding: '8px 12px' }}
                >
                  {uploading ? 'ЗАГРУЗКА...' : item.photo ? 'ЗАМЕНИТЬ' : 'ДОБАВИТЬ ФОТО'}
                </button>
                {item.photo && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={handleRemovePhoto}
                    style={{ ...btnGhost, fontSize: '10px', padding: '8px 12px', color: colors.muted }}
                  >
                    УБРАТЬ
                  </button>
                )}
              </div>
              <div>
                <p style={{ ...sectionTitle, marginBottom: '8px' }}>Семпл</p>
                <button
                  type="button"
                  disabled={togglingSample}
                  onClick={handleToggleSample}
                  style={item.sample_printed
                    ? {
                      ...sampleBtnWide,
                      background: colors.accent,
                      color: colors.bg,
                    }
                    : {
                      ...sampleBtnWide,
                      background: 'transparent',
                      color: colors.accentBright,
                    }}
                >
                  {togglingSample
                    ? 'СОХРАНЕНИЕ...'
                    : item.sample_printed
                      ? '✓ СЕМПЛ ОТПЕЧАТАН'
                      : 'ОТМЕТИТЬ: СЕМПЛ ОТПЕЧАТАН'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <p style={sectionTitle}>Фото</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
              <ItemPhotoThumb
                item={item}
                size={photoSize}
                onClick={() => !uploading && fileRef.current?.click()}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  style={{ ...btnGhost, fontSize: '10px', padding: '6px 10px', width: '100%' }}
                >
                  {uploading ? 'ЗАГРУЗКА...' : item.photo ? 'ЗАМЕНИТЬ' : 'ДОБАВИТЬ ФОТО'}
                </button>
                {item.photo && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={handleRemovePhoto}
                    style={{ ...btnGhost, fontSize: '10px', padding: '6px 10px', width: '100%', color: colors.muted }}
                  >
                    УБРАТЬ
                  </button>
                )}
              </div>
            </div>

            <div>
              <p style={sectionTitle}>Семпл</p>
              <button
                type="button"
                disabled={togglingSample}
                onClick={handleToggleSample}
                style={item.sample_printed
                  ? {
                    ...sampleBtnWide,
                    background: colors.accent,
                    color: colors.bg,
                  }
                  : {
                    ...sampleBtnWide,
                    background: 'transparent',
                    color: colors.accentBright,
                  }}
              >
                {togglingSample
                  ? 'СОХРАНЕНИЕ...'
                  : item.sample_printed
                    ? '✓ СЕМПЛ ОТПЕЧАТАН'
                    : 'ОТМЕТИТЬ: СЕМПЛ ОТПЕЧАТАН'}
              </button>
            </div>
          </>
        )}
      </div>

      {error && (
        <p style={{ fontSize: '11px', color: colors.warn, marginTop: '14px', lineHeight: 1.4 }}>{error}</p>
      )}
    </div>
  )
}
