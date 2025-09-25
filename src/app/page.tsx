// src/app/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import CardRow from '@/components/CardRow'
import { ensureUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

type PlayerObj = { full_name: string }
type Row = {
  id: string
  created_at: string
  year: number | null
  brand: string | null
  card_no: string | null
  is_graded: boolean | null
  grading_company: string | null
  grading_no: string | null
  grade: number | null
  player: PlayerObj | PlayerObj[] | null      // <— accept either
  card_images: { storage_path: string; is_primary: boolean | null }[]
}

function getPlayerName(r: Row) {
  return Array.isArray(r.player)
    ? r.player[0]?.full_name ?? ''
    : r.player?.full_name ?? ''
}

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const [cards, setCards] = useState<Row[]>([])
  const [sortBy, setSortBy] = useState<'player' | 'year' | 'brand' | 'number'>('player')

  useEffect(() => {
    (async () => {
      await ensureUser()
      const { data } = await supabase
        .from('cards')
        .select(`
          id, created_at, year, brand, card_no, is_graded, grading_company, grading_no, grade,
          player:players(full_name),
          card_images(storage_path, is_primary)
        `)
        .order('created_at', { ascending: false })

      setCards((data as any[]) ?? []) // runtime shape can vary; we normalize in helpers
      setLoading(false)
    })()
  }, [])

  const sorted = useMemo(() => {
    const c = [...cards]
    switch (sortBy) {
      case 'player':
        return c.sort((a, b) => getPlayerName(a).localeCompare(getPlayerName(b)))
      case 'year':
        return c.sort((a, b) => (a.year || 0) - (b.year || 0))
      case 'brand':
        return c.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''))
      case 'number':
        return c.sort(
          (a, b) =>
            (parseInt(a.card_no || '0') || 0) - (parseInt(b.card_no || '0') || 0)
        )
      default:
        return c
    }
  }, [cards, sortBy])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Sort:</span>
        {(['player', 'year', 'brand', 'number'] as const).map(k => (
          <button
            key={k}
            onClick={() => setSortBy(k)}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              sortBy === k
                ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {k.charAt(0).toUpperCase() + k.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          No cards yet. Add your first card.
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(c => (
            <CardRow key={c.id} card={c as any} />
          ))}
        </div>
      )}
    </div>
  )
}