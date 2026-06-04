'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from './Modal'
import { MOMENTS_DROP } from '@/lib/constants'
import { upsertMomentAction } from '@/app/actions'

export default function DropIdeationMoments({
  dropId,
  path,
  initialMoments,
}: {
  dropId: string
  path: string
  initialMoments: { key: string; value: string }[]
}) {
  const router = useRouter()
  const defs = MOMENTS_DROP.ideation
  const [moments, setMoments] = useState<Record<string, string>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [stepDraft, setStepDraft] = useState('')
  const momentsRef = useRef(moments)
  momentsRef.current = moments

  useEffect(() => {
    const map: Record<string, string> = {}
    initialMoments.forEach(m => { map[m.key] = m.value || '' })
    setMoments(map)
  }, [initialMoments])

  useEffect(() => {
    if (!modalOpen || !defs[step]) return
    setStepDraft(momentsRef.current[defs[step].key] ?? '')
  }, [modalOpen, step, defs])

  const answeredDefs = defs.filter(({ key }) => (moments[key] ?? '').trim())

  async function persistCurrent() {
    const d = defs[step]
    if (!d) return
    const val = stepDraft.trim()
    await upsertMomentAction(dropId, 'ideation', d.key, val, path, 'drop')
    setMoments(prev => ({ ...prev, [d.key]: val }))
  }

  function openModal() {
    const firstEmpty = defs.findIndex(({ key }) => !(moments[key]?.trim()))
    setStep(firstEmpty === -1 ? 0 : firstEmpty)
    setModalOpen(true)
  }

  async function closeModal() {
    await persistCurrent()
    setModalOpen(false)
    router.refresh()
  }

  async function handleNext() {
    await persistCurrent()
    if (step < defs.length - 1) setStep(s => s + 1)
    else setModalOpen(false)
    router.refresh()
  }

  async function handleBack() {
    await persistCurrent()
    if (step > 0) setStep(s => s - 1)
  }

  if (!defs.length) return null

  const cur = defs[step]

  return (
    <>
      <div className="card mb-3 p-5">
        <div className={`flex flex-wrap items-start justify-between gap-3 ${answeredDefs.length ? 'mb-4' : ''}`}>
          <h3 className="label-caps m-0">Моменты коллекции (создание)</h3>
          <button type="button" className="btn-outline" onClick={openModal}>
            {answeredDefs.length ? 'ИЗМЕНИТЬ' : 'ЗАПОЛНИТЬ'}
          </button>
        </div>
        {answeredDefs.length > 0 && (
          <div className="flex flex-col gap-4">
            {answeredDefs.map(({ key, label }) => (
              <div key={key}>
                <p className="label-caps mb-1.5">{label}</p>
                <p className="m-0 whitespace-pre-wrap text-[13px] leading-relaxed text-white">{moments[key]}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={`МОМЕНТЫ КОЛЛЕКЦИИ · ${step + 1} / ${defs.length}`} maxWidth="560px">
        {cur && (
          <>
            <p className="label-caps mb-2.5">Вопрос</p>
            <p className="mb-4 text-sm leading-snug text-white">{cur.label}</p>
            <label className="label-caps mb-1.5 block">Ответ</label>
            <textarea
              value={stepDraft}
              onChange={e => setStepDraft(e.target.value)}
              className="min-h-[120px] w-full"
              autoFocus
            />
            <div className="mt-5 flex flex-wrap justify-between gap-2.5">
              <button type="button" className="btn-ghost disabled:opacity-40" disabled={step === 0} onClick={handleBack}>
                НАЗАД
              </button>
              <button type="button" className="btn-outline" onClick={handleNext}>
                {step >= defs.length - 1 ? 'ГОТОВО' : 'ДАЛЕЕ'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
