'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from './AppShell'
import Modal from './Modal'
import PhotoDropZone from './PhotoDropZone'
import { STAGES } from '@/lib/constants'
import {
  deleteProductAction,
  linkProductToDropAction,
  unlinkProductFromDropAction,
  updateProductNotesAction,
  updateItemNameAction,
  toggleItemSampleAction,
  toggleTaskAction,
} from '@/app/actions'
import { getItemPhotoDownloadUrl } from '@/lib/items'

type Photo = { id: string; filename: string; originalName: string | null }
type Task = { id: string; title: string; completed: boolean }
type Item = {
  id: string
  name: string
  notes: string
  stage: string
  dropId: string | null
  samplePrinted: boolean
  photos: Photo[]
  drop: { id: string; name: string; status: string } | null
}
type DropOption = { id: string; name: string; status: string }

function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => e.key === 'Enter' && onToggle()}
      className={`task-row ${task.completed ? 'task-row--done' : 'task-row--open'}`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border-2 ${
          task.completed ? 'border-[#14C97A] bg-[#14C97A]' : 'border-[#535454] bg-transparent'
        }`}
      >
        {task.completed && <span className="text-[10px] font-bold text-[#050505]">✓</span>}
      </span>
      <span className={`text-[13px] leading-snug ${task.completed ? 'text-[#C8C8C8] line-through' : 'text-white'}`}>
        {task.title}
      </span>
    </div>
  )
}

export default function ProductCatalogView({
  item,
  drops,
  tasksByStage,
}: {
  item: Item
  drops: DropOption[]
  tasksByStage: Record<string, Task[]>
}) {
  const router = useRouter()
  const path = `/products/${item.id}`
  const [, startTransition] = useTransition()
  const [name, setName] = useState(item.name)
  const [notes, setNotes] = useState(item.notes)
  const [savingNotes, setSavingNotes] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [linkDropId, setLinkDropId] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalTasks = Object.values(tasksByStage).flat()
  const tasksDone = totalTasks.filter(t => t.completed).length

  async function uploadPhotos(files: FileList) {
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

  async function removePhoto(photoId: string) {
    setError(null)
    try {
      const res = await fetch(`/api/items/${item.id}/photos/${photoId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete')
      router.refresh()
    } catch {
      setError('Не удалось удалить фото.')
    }
  }

  return (
    <AppShell
      title={item.name}
      actions={
        <div className="flex flex-wrap gap-2">
          {item.dropId && (
            <Link href={`/drops/${item.dropId}/items/${item.id}`} className="btn-ghost">
              ОТКРЫТЬ ПОЗИЦИЮ
            </Link>
          )}
          <button type="button" className="btn-ghost text-[#F0B429]" onClick={() => setDeleteOpen(true)}>
            УДАЛИТЬ
          </button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <p className="label-caps mb-4 text-[#14C97A]">Основное</p>
          <form
            className="mb-4 flex flex-col gap-3"
            onSubmit={async e => {
              e.preventDefault()
              await updateItemNameAction(item.id, item.dropId, name)
              router.refresh()
            }}
          >
            <div>
              <label className="label-caps mb-1.5 block">Название</label>
              <input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <button type="submit" className="btn-outline w-full" disabled={!name.trim()}>
              СОХРАНИТЬ НАЗВАНИЕ
            </button>
          </form>

          <p className="label-caps mb-2 text-[#14C97A]">Дроп</p>
          {item.drop ? (
            <div className="flex flex-col gap-2">
              <Link href={`/drops/${item.drop.id}`} className="text-[15px] text-white hover:text-[#14C97A]">
                {item.drop.name}
              </Link>
              <button
                type="button"
                className="btn-ghost w-full"
                onClick={async () => {
                  await unlinkProductFromDropAction(item.id)
                  router.refresh()
                }}
              >
                ОТВЯЗАТЬ ОТ ДРОПА
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-[#C8C8C8]">Не привязан</p>
              <select value={linkDropId} onChange={e => setLinkDropId(e.target.value)}>
                <option value="">Выберите дроп</option>
                {drops.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-outline w-full"
                disabled={!linkDropId}
                onClick={async () => {
                  const res = await linkProductToDropAction(item.id, linkDropId)
                  if (res?.error) setError(res.error)
                  else router.refresh()
                }}
              >
                ПРИВЯЗАТЬ К ДРОПУ
              </button>
            </div>
          )}

          <div className="mt-5">
            <p className="label-caps mb-2 text-[#14C97A]">Семпл</p>
            <button
              type="button"
              className={`w-full border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider ${
                item.samplePrinted
                  ? 'border-[#14C97A] bg-[#0E7A45] text-[#050505]'
                  : 'border-[#14C97A] bg-transparent text-[#14C97A]'
              }`}
              onClick={async () => {
                await toggleItemSampleAction(item.id, item.dropId, !item.samplePrinted)
                router.refresh()
              }}
            >
              {item.samplePrinted ? '✓ СЕМПЛ ОТПЕЧАТАН' : 'ОТМЕТИТЬ: СЕМПЛ ОТПЕЧАТАН'}
            </button>
          </div>
        </div>

        <div className="card p-5">
          <p className="label-caps mb-4 text-[#14C97A]">Заметки</p>
          <textarea rows={8} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Заметки по продукту..." />
          <button
            type="button"
            className="btn-outline mt-3 w-full"
            disabled={savingNotes}
            onClick={async () => {
              setSavingNotes(true)
              await updateProductNotesAction(item.id, notes)
              setSavingNotes(false)
              router.refresh()
            }}
          >
            {savingNotes ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ ЗАМЕТКИ'}
          </button>
        </div>
      </div>

      <div className="card mt-4 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="label-caps text-[#14C97A]">
            Задачи {totalTasks.length > 0 && `(${tasksDone}/${totalTasks.length})`}
          </p>
          <span className="label-caps text-[#C8C8C8]">Этап: {STAGES.find(s => s.key === item.stage)?.short ?? item.stage}</span>
        </div>
        {totalTasks.length === 0 ? (
          <p className="text-sm text-[#C8C8C8]">
            Задач пока нет. Привяжи продукт к дропу или открой позицию в дропе.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {STAGES.map(stage => {
              const tasks = tasksByStage[stage.key] ?? []
              if (!tasks.length) return null
              const done = tasks.filter(t => t.completed).length
              const active = item.stage === stage.key
              return (
                <div key={stage.key} className="border border-[#3D5248] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className={`label-caps ${active ? 'text-[#14C97A]' : 'text-white'}`}>{stage.label}</p>
                    <span className="label-caps text-[#C8C8C8]">{done}/{tasks.length}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {tasks.map(task => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onToggle={() =>
                          startTransition(() =>
                            toggleTaskAction(task.id, !task.completed, path),
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card mt-4 p-5">
        <p className="label-caps mb-4 text-[#14C97A]">Фото ({item.photos.length})</p>

        <PhotoDropZone
          onFiles={uploadPhotos}
          uploading={uploading}
          className="mb-4"
          emptyLabel="Перетащи скриншот, вставь Ctrl+V или выбери файл"
        />

        {item.photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {item.photos.map(photo => {
              const url = getItemPhotoDownloadUrl(item.id, photo.id)
              const download = `${url}?download=1`
              return (
                <div key={photo.id} className="border border-[#3D5248] p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="mb-2 aspect-square w-full object-cover" />
                  <div className="flex flex-col gap-1">
                    <a href={download} className="btn-ghost text-center text-[10px]">
                      СКАЧАТЬ
                    </a>
                    <button
                      type="button"
                      className="btn-ghost text-[10px] text-[#C8C8C8]"
                      onClick={() => removePhoto(photo.id)}
                    >
                      УДАЛИТЬ
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-[11px] text-[#F0B429]">{error}</p>}

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="УДАЛИТЬ ПРОДУКТ?">
        <p className="mb-4 text-sm text-[#C8C8C8]">
          Продукт и все фото будут удалены безвозвратно.
          {item.drop && ' Связь с дропом тоже исчезнет.'}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn-outline flex-1"
            onClick={async () => {
              await deleteProductAction(item.id)
              router.push('/products')
            }}
          >
            УДАЛИТЬ
          </button>
          <button type="button" className="btn-ghost flex-1" onClick={() => setDeleteOpen(false)}>
            ОТМЕНА
          </button>
        </div>
      </Modal>
    </AppShell>
  )
}
