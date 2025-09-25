'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ensureUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

type CardRow = {
  id: string
  created_at: string
  year: number | null
  brand: string | null
  card_no: string | null
  is_graded: boolean | null
  grading_company: string | null
  grading_no: string | null
  grade: number | null
  player: { full_name: string } | { full_name?: string } | null
  card_images: { storage_path: string; is_primary?: boolean | null }[]
}

const sortKeys = ['player', 'year', 'brand', 'number'] as const
type SortKey = (typeof sortKeys)[number]

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="pill">{children}</span>
}

function publicUrl(path: string) {
  return supabase.storage.from('card-images').getPublicUrl(path).data.publicUrl
}

export default function HomePage() {
  const [cards, setCards] = useState<CardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortKey>('player')

  // Load data (anonymous auth ok)
  useEffect(() => {
    let active = true
    ;(async () => {
      await ensureUser()
      const { data, error } = await supabase
        .from('cards')
        .select(
          `
          id, created_at, year, brand, card_no, is_graded, grading_company, grading_no, grade,
          player:players(full_name),
          card_images(storage_path, is_primary)
        `
        )
        .order('created_at', { ascending: false })

      if (!active) return
      if (!error && data) setCards(data as unknown as CardRow[])
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  const sorted = useMemo(() => {
    const copy = [...cards]
    copy.sort((a, b) => {
      switch (sortBy) {
        case 'player':
          return (a.player?.full_name || '').localeCompare(
            b.player?.full_name || ''
          )
        case 'year':
          return (b.year ?? 0) - (a.year ?? 0)
        case 'brand':
          return (a.brand || '').localeCompare(b.brand || '')
        case 'number':
          return (a.card_no || '').localeCompare(b.card_no || '')
      }
    })
    return copy
  }, [cards, sortBy])

async function handleDelete(card: CardRow) {
  const ok = confirm(`Delete "${card.player?.full_name || 'Card'}"?`)
  if (!ok) return

  // Try to delete the card first. If you added ON DELETE CASCADE, card_images go too.
  const { data: deleted, error } = await supabase
    .from('cards')
    .delete()
    .eq('id', card.id)
    .select('id') // return deleted rows so we can verify

  if (error) {
    alert(`Delete failed: ${error.message}`)
    return
  }
  if (!deleted || deleted.length === 0) {
    alert(
      "This card wasn't removed because you don't have permission to delete it (it may belong to a different session/user)."
    )
    return
  }

  // Best-effort: remove storage files (ignoring errors)
  if (card.card_images?.length) {
    try {
      await supabase
        .storage
        .from('card-images')
        .remove(card.card_images.map(i => i.storage_path))
    } catch {}
  }

  // Now update UI
  setCards(prev => prev.filter(c => c.id !== card.id))
}

  return (
    <div className="space-y-4">
      {/* Sort row */}
      <div className="-mt-1 flex items-center gap-2 text-sm text-slate-600">
        <span>Sort:</span>
        {sortKeys.map((k) => (
          <button
            key={k}
            onClick={() => setSortBy(k)}
            className={[
              'pill',
              sortBy === k ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : '',
            ].join(' ')}
            title={`Sort by ${k}`}
          >
            {k === 'player' ? 'Player' : k === 'year' ? 'Year' : k === 'brand' ? 'Brand' : 'Number'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-16 text-center text-slate-500">Loading…</div>
      )}

      <div className="space-y-3">
        {sorted.map((c) => {
          const imgs = Array.isArray(c.card_images) ? c.card_images : []
          const chosen = imgs.find((i) => i.is_primary) ?? imgs[0]
          const url = chosen ? publicUrl(chosen.storage_path) : null
          const title = `${c.year ?? ''} ${c.brand ?? ''} #${c.card_no ?? ''}`.trim()
          const graded = !!c.is_graded
          const chip = graded
            ? `${c.grading_company ?? ''} ${c.grade ?? ''}${
                c.grading_no ? ` (#${c.grading_no})` : ''
              }`.trim()
            : 'Raw'

        return (
          <div key={c.id} className="card p-3">
            <div className="flex items-center gap-3">
              {/* Thumb */}
              <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200">
                {url && (
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-contain"
                    priority={false}
                  />
                )}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold">
                  {c.player?.full_name || 'Unknown Player'}
                </div>
                <div className="truncate text-sm text-slate-600">{title}</div>
                <div className="mt-2">
                  <Pill>{chip || 'Raw'}</Pill>
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/card/${c.id}`}
                  title="Details"
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
                >
                  Details
                </Link>
                <button
                  onClick={() => handleDelete(c)}
                  title="Delete"
                  className="rounded-lg border border-red-300 px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )})}

        {!loading && sorted.length === 0 && (
          <div className="py-16 text-center text-slate-500">
            No cards yet. <Link href="/add" className="text-indigo-600 underline">Add your first card</Link>.
          </div>
        )}
      </div>
    </div>
  )
}