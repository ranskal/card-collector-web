'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { publicUrl } from '@/lib/storage' // same helper you were using

type ParamsP = { id: string }

type Img = { storage_path: string; is_primary?: boolean | null }
type Card = {
  id: string
  year: number | null
  brand: string | null
  card_no: string | null
  sport: string | null
  is_graded: boolean | null
  grading_company: string | null
  grading_no: string | null
  grade: number | null
  player?: { full_name?: string } | null
  card_images?: Img[] | null
}

export default function CardDetails({
  params,
}: {
  params: Promise<ParamsP>
}) {
  const { id } = use(params)
  const [card, setCard] = useState<Card | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      const { data } = await supabase
        .from('cards')
        .select(
          `
          id, year, brand, card_no, sport,
          is_graded, grade, grading_company, grading_no,
          player:players(full_name),
          card_images(storage_path, is_primary)
        `
        )
        .eq('id', id)
        .maybeSingle()

      if (!cancel) setCard((data as Card) ?? null)
    })()
    return () => {
      cancel = true
    }
  }, [id])

  const imgs: Img[] = useMemo(
    () => (Array.isArray(card?.card_images) ? card!.card_images! : []),
    [card]
  )

  // choose primary or first, and update index if data changes
  useEffect(() => {
    if (!imgs.length) return
    const primaryIdx = Math.max(
      0,
      imgs.findIndex((i) => i.is_primary) // -1 => no primary
    )
    setCurrentIdx(primaryIdx === -1 ? 0 : primaryIdx)
  }, [imgs])

  if (!card) {
    return <div className="py-16 text-center text-slate-500">Loading…</div>
  }

  const mainUrl = imgs[currentIdx]
    ? publicUrl(imgs[currentIdx].storage_path)
    : undefined

  const title = `${card.year ?? ''} ${card.brand ?? ''} #${card.card_no ?? ''}`.trim()
  const player = card.player?.full_name || 'Unknown Player'

  const graded =
    card.is_graded && (card.grading_company || card.grade)
      ? `${card.grading_company ?? ''} ${card.grade ?? ''}${
          card.grading_no ? ` (#${card.grading_no})` : ''
        }`.trim()
      : 'Raw'

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Back */}
      <div className="mb-4">
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ← Back
        </Link>
      </div>

      {/* Hero image — now ~85% width, centered */}
      {mainUrl ? (
        <div className="mx-auto w-[92%] sm:w-[88%] md:w-[85%]">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="block w-full"
            title="Tap to view larger"
          >
            <div className="relative w-full overflow-hidden rounded-2xl border bg-white shadow-sm">
              <Image
                src={mainUrl}
                alt={title || 'card'}
                width={1600}
                height={1000}
                className="w-full h-auto object-contain"
                priority
              />
            </div>
          </button>
        </div>
      ) : null}

      {/* Thumbnails */}
      {imgs.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {imgs.map((im, i) => {
            const url = publicUrl(im.storage_path)
            const active = i === currentIdx
            return (
              <button
                type="button"
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={[
                  'relative h-16 w-16 overflow-hidden rounded-xl border',
                  active ? 'border-indigo-400 ring-2 ring-indigo-300' : 'border-slate-200',
                ].join(' ')}
                title={`Photo ${i + 1}`}
              >
                <Image src={url} alt="" fill sizes="64px" className="object-contain" />
              </button>
            )
          })}
        </div>
      )}

      {/* Card panel */}
      <div className="mt-5 rounded-2xl border bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">{player}</h1>
        <p className="mt-1 text-slate-600">{title}</p>

        <div className="mt-3 flex gap-2 flex-wrap">
          <Chip>{card.sport || '—'}</Chip>
          <Chip tone={graded === 'Raw' ? 'neutral' : 'primary'}>{graded}</Chip>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && mainUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] rounded-xl overflow-hidden bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={mainUrl}
              alt={title || 'card'}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'primary'
}) {
  const styles =
    tone === 'primary'
      ? 'bg-indigo-50 text-indigo-700'
      : 'bg-slate-100 text-slate-700'
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles}`}>
      {children}
    </span>
  )
}