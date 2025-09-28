'use client'

import { use, useEffect, useState } from 'react'
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
  grading_company: string | null
  grading_no: string | null
  grade: number | null
  player?: { full_name?: string } | null
  card_images?: { storage_path: string; is_primary?: boolean | null }[]
}

export default function CardDetails({
  params,
}: {
  params: Promise<ParamsP>
}) {
  const { id } = use(params)
  const [card, setCard] = useState<Card | null>(null)
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      const { data, error } = await supabase
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

      if (!cancel && !error) {
        const c = (data ?? null) as Card | null
        setCard(c)
        if (c?.card_images?.length) {
          const p = c.card_images.findIndex(i => i.is_primary)
          setIdx(p >= 0 ? p : 0)
        } else {
          setIdx(0)
        }
      }
    })()
    return () => { cancel = true }
  }, [id])

  if (!card) return <div className="py-16 text-center text-slate-500">Loading…</div>

  const imgs = Array.isArray(card.card_images) ? card.card_images : []
  const hero = imgs[idx] ? publicUrl(imgs[idx].storage_path) : undefined

  const title = `${card.year ?? ''} ${card.brand ?? ''} #${card.card_no ?? ''}`.trim()
  const player = card.player?.full_name || 'Unknown Player'

  // Grading chip text
  const gradingChip = card.is_graded
    ? `${card.grading_company ?? ''} ${card.grade ?? ''}${
        card.grading_no ? ` (#${card.grading_no})` : ''
      }`.trim()
    : 'Raw'

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Back */}
      <div className="mb-4">
        <Link href="/" className="text-sm text-indigo-600 hover:underline">← Back</Link>
      </div>

      {/* Hero image (capped height so it doesn’t get huge) */}
      {hero ? (
        <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden rounded-xl border bg-white">
          <Image
            src={hero}
            alt={title || 'card'}
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-contain"
            priority
          />
        </div>
      ) : null}

      {/* Thumbnails / carousel */}
      {imgs.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto py-1">
          {imgs.map((im, i) => {
            const url = publicUrl(im.storage_path)
            const active = i === idx
            return (
              <button
                key={im.storage_path + i}
                onClick={() => setIdx(i)}
                className={[
                  'relative h-16 w-16 rounded-lg overflow-hidden border bg-white shrink-0',
                  active ? 'ring-2 ring-indigo-500 border-indigo-300' : 'border-slate-200',
                ].join(' ')}
                title={`Photo ${i + 1}`}
              >
                <Image src={url} alt="" fill sizes="64px" className="object-contain" />
              </button>
            )
          })}
        </div>
      )}

      {/* Summary only (sport + graded/raw chip) */}
      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">{player}</h1>
        <p className="mt-1 text-slate-600">{title}</p>

        <div className="mt-3 flex gap-2 flex-wrap">
          <span className="pill">{card.sport || '—'}</span>
          <span className="pill">{gradingChip}</span>
        </div>

        {/* Space reserved for RC / Auto chips later */}
      </div>
    </div>
  )
}