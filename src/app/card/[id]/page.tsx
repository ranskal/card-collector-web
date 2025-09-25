'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { publicUrl } from '@/lib/storage'

type ParamsP = { id: string }

export default function CardDetails({
  params,
}: {
  params: Promise<ParamsP> // 👈 Next 15: params is a Promise
}) {
  const { id } = use(params) // 👈 unwrap once
  const [card, setCard] = useState<any | null>(null)

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

      if (!cancel) setCard((data as any) ?? null)
    })()

    return () => {
      cancel = true
    }
  }, [id])

  if (!card) return <div className="py-16 text-center text-slate-500">Loading…</div>

  const imgs: { storage_path: string; is_primary?: boolean | null }[] =
    Array.isArray(card.card_images) ? card.card_images : []
  const chosen = imgs.find((i) => i.is_primary) ?? imgs[0]
  const hero = chosen ? publicUrl(chosen.storage_path) : undefined

  const title = `${card.year ?? ''} ${card.brand ?? ''} #${card.card_no ?? ''}`.trim()
  const player = card.player?.full_name || 'Unknown Player'
  const cert = card.grading_no ? ` #${card.grading_no}` : ''
  const graded =
    card.is_graded && (card.grading_company || card.grade)
      ? `${card.grading_company ?? ''} ${card.grade ?? ''}${cert}`.trim()
      : 'Raw'

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Back */}
      <div className="mb-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back
        </Link>
      </div>

      {/* Hero image */}
      {hero ? (
        <div className="relative w-full overflow-hidden rounded-xl border bg-white">
          <Image
            src={hero}
            alt={title || 'card'}
            width={1600}
            height={900}
            className="w-full h-auto object-contain"
            priority
          />
        </div>
      ) : null}

      {/* Card panel */}
      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">{player}</h1>
        <p className="mt-1 text-slate-600">{title}</p>

        <div className="mt-3 flex gap-2 flex-wrap">
          <Chip>{card.sport || '—'}</Chip>
          <Chip tone={graded === 'Raw' ? 'neutral' : 'primary'}>{graded}</Chip>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <Meta label="Player" value={player} />
          <Meta label="Year" value={String(card.year ?? '—')} />
          <Meta label="Brand" value={card.brand ?? '—'} />
          <Meta label="Card #" value={String(card.card_no ?? '—')} />
          <Meta label="Sport" value={card.sport ?? '—'} />
          {graded !== 'Raw' && (
            <>
              <Meta label="Company" value={card.grading_company ?? '—'} />
              <Meta label="Cert #" value={String(card.grading_no ?? '—')} />
              <Meta label="Grade" value={String(card.grade ?? '—')} />
            </>
          )}
        </div>
      </div>
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value || '—'}</span>
    </div>
  )
}