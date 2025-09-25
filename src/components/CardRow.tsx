// src/components/CardRow.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import Pill from './Pill'
import { publicUrl } from '@/lib/storage'

type CardImg = { storage_path: string; is_primary: boolean | null }
type PlayerObj = { full_name: string }
type Card = {
  id: string
  year: number | null
  brand: string | null
  card_no: string | null
  is_graded: boolean | null
  grading_company: string | null
  grading_no: string | null
  grade: number | null
  // accept either object OR array from Supabase
  player: PlayerObj | PlayerObj[] | null
  card_images: CardImg[]
}

function playerName(card: Card) {
  return Array.isArray(card.player)
    ? card.player[0]?.full_name ?? 'Unknown Player'
    : card.player?.full_name ?? 'Unknown Player'
}

export default function CardRow({ card }: { card: Card }) {
  const title = `${card.year ?? ''} ${card.brand ?? ''} #${card.card_no ?? ''}`.trim()
  const player = playerName(card)

  const label = card.is_graded
    ? `${card.grading_company ?? ''} ${card.grade ?? ''}${
        card.grading_no ? ` (#${card.grading_no})` : ''
      }`.trim()
    : 'Raw'

  const imgs = Array.isArray(card.card_images) ? card.card_images : []
  const chosen = imgs.find(i => i.is_primary) || imgs[0]
  const thumb = chosen ? publicUrl(chosen.storage_path) : undefined

  return (
    <Link
      href={`/card/${card.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {thumb ? (
            <Image src={thumb} alt="" width={96} height={96} className="h-16 w-16 object-contain" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-extrabold text-slate-900">{player}</div>
          <div className="truncate text-sm text-slate-500">{title}</div>
          <div className="mt-2">
            <Pill tone={card.is_graded ? 'primary' : 'neutral'}>{label || 'Raw'}</Pill>
          </div>
        </div>
      </div>
    </Link>
  )
}