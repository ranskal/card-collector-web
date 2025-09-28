'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { publicUrl } from '@/lib/storage'

type ParamsP = { id: string }

type Card = {
  id: string
  year: number | null
  brand: string | null
  card_no: string | null
  sport: string | null
  is_graded: boolean | null
  grade: number | null
  grading_company: string | null
  grading_no: string | null
  notes: string | null
  player: { full_name?: string } | null
  card_images: { storage_path: string; is_primary?: boolean | null }[] | null
  card_tags: { tags?: { label?: string } | null }[] | null
}

export default function CardDetails({ params }: { params: Promise<ParamsP> }) {
  const { id } = use(params)
  const [card, setCard] = useState<Card | null>(null)
  const [idx, setIdx] = useState(0)
  const [open, setOpen] = useState(false)

  // Fetch card
  useEffect(() => {
    let cancel = false
    ;(async () => {
      const { data } = await supabase
        .from('cards')
        .select(`
          id, year, brand, card_no, sport,
          is_graded, grade, grading_company, grading_no, notes,
          player:players(full_name),
          card_images(storage_path, is_primary),
          card_tags:card_tags(tags(label))
        `)
        .eq('id', id)
        .maybeSingle()

      if (!cancel) setCard((data as unknown as Card) ?? null)
    })()
    return () => {
      cancel = true
    }
  }, [id])

  // Select primary image by default
  useEffect(() => {
    if (!card) return
    const imgs = Array.isArray(card.card_images) ? card.card_images : []
    const primaryIndex = imgs.findIndex((i) => i.is_primary)
    setIdx(primaryIndex === -1 ? 0 : primaryIndex)
  }, [card])

  // ESC to close lightbox
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!card) return <div className="py-16 text-center text-slate-500">Loading…</div>

  const imgs = (Array.isArray(card.card_images) ? card.card_images : []) as {
    storage_path: string
    is_primary?: boolean | null
  }[]
  const urls = imgs.map((i) => publicUrl(i.storage_path))
  const activeUrl = urls[idx]

  const title = `${card.year ?? ''} ${card.brand ?? ''} #${card.card_no ?? ''}`.trim()
  const player = card.player?.full_name || 'Unknown Player'
  const graded =
    card.is_graded && (card.grading_company || card.grade)
      ? `${card.grading_company ?? ''} ${card.grade ?? ''}${
          card.grading_no ? ` (#${card.grading_no})` : ''
        }`.trim()
      : 'Raw'

  const tags: string[] = useMemo(
    () =>
      (card.card_tags ?? [])
        .map((ct) => ct.tags?.label)
        .filter(Boolean) as string[],
    [card.card_tags]
  )

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Back */}
      <div className="mb-4">
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ← Back
        </Link>
      </div>

      {/* Hero (slightly smaller, centered) */}
      {activeUrl ? (
        <>
          <div className="mx-auto w-[92%] sm:w-[88%] md:w-[85%]">
            <div
              className="relative w-full overflow-hidden rounded-2xl border bg-white cursor-zoom-in"
              onClick={() => setOpen(true)}
              title="Tap to view larger"
            >
              <div className="h-[48vh] sm:h-[52vh]">
                <Image
                  src={activeUrl}
                  alt={title || 'card'}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Thumbnails */}
          {urls.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {urls.map((u, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={[
                    'relative rounded-xl border bg-white',
                    'h-[72px] w-[72px] shrink-0 overflow-hidden',
                    i === idx
                      ? 'ring-2 ring-indigo-500 border-indigo-300'
                      : 'border-slate-200',
                  ].join(' ')}
                  title={`Photo ${i + 1}`}
                >
                  <Image src={u} alt="" fill sizes="72px" className="object-contain" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : null}

      {/* Card panel */}
      <div className="mt-5 rounded-2xl border bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">{player}</h1>
        <p className="mt-1 text-slate-600">{title}</p>

        <div className="mt-3 flex gap-2 flex-wrap">
          <span className="pill">{card?.sport ?? '—'}</span>
          <span className="pill whitespace-normal break-words">{graded}</span>
          {tags.map((t) => (
            <span key={t} className="pill">
              {t}
            </span>
          ))}
        </div>

        {card?.notes ? (
          <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">
            {card.notes}
          </p>
        ) : null}
      </div>

      {/* Lightbox */}
      {open && activeUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-[min(95vw,1200px)] h-[min(90vh,1000px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeUrl}
              alt={title || 'card'}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          <button
            className="absolute top-4 right-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
            onClick={() => setOpen(false)}
            title="Close"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}