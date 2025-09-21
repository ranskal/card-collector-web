'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ensureUser } from '@/lib/auth'

type ImgRow = { storage_path: string; is_primary: boolean | null }
type PlayerObj = { full_name: string }
type PlayerRel = PlayerObj | PlayerObj[] | null

type CardRow = {
  id: string
  created_at: string
  year: number | null
  brand: string | null
  card_no: string | null
  is_graded: boolean | null
  grade: number | null
  grading_company: string | null
  grading_no: string | null
  player: PlayerRel
  card_images: ImgRow[]
}

type SortKey = 'created_at' | 'player' | 'year' | 'brand' | 'card_no'

function playerFullName(p: PlayerRel): string | undefined {
  if (!p) return undefined
  return Array.isArray(p) ? p[0]?.full_name : p.full_name
}

export default function HomePage() {
  const [cards, setCards] = useState<CardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    (async () => {
      try {
        const u = await ensureUser()
        console.log('[cards] user id:', u.id)

        const { data, error } = await supabase
          .from('cards')
          .select(`
            id, created_at, year, brand, card_no, is_graded, grade, grading_company, grading_no,
            player:players(full_name),
            card_images(storage_path, is_primary)
          `)
          .order('created_at', { ascending: false })

        if (error) throw error
        setCards((data ?? []) as unknown as CardRow[])
      } catch (e: any) {
        console.error(e)
        setErr(e.message ?? String(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const sorted = useMemo(() => {
    const copy = [...cards]
    copy.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      let av: any
      let bv: any
      switch (sortKey) {
        case 'player':
          av = (playerFullName(a.player) ?? '').toLowerCase()
          bv = (playerFullName(b.player) ?? '').toLowerCase()
          break
        case 'year':
          av = a.year ?? 0
          bv = b.year ?? 0
          break
        case 'brand':
          av = (a.brand ?? '').toLowerCase()
          bv = (b.brand ?? '').toLowerCase()
          break
        case 'card_no':
          av = (a.card_no ?? '').toString().padStart(6, '0')
          bv = (b.card_no ?? '').toString().padStart(6, '0')
          break
        default:
          av = a.created_at
          bv = b.created_at
      }
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
    return copy
  }, [cards, sortKey, sortDir])

  async function handleDelete(card: CardRow) {
    const title = `${playerFullName(card.player) ?? 'Unknown'} — ${card.year ?? ''} ${card.brand ?? ''} #${card.card_no ?? ''}`.trim()
    if (!confirm(`Delete this card?\n\n${title}`)) return

    try {
      await ensureUser()

      const { data: imgs } = await supabase
        .from('card_images')
        .select('storage_path')
        .eq('card_id', card.id)

      if (imgs && imgs.length) {
        await supabase.storage.from('card-images').remove(imgs.map(i => i.storage_path))
        await supabase.from('card_images').delete().eq('card_id', card.id)
      }

      const { error } = await supabase.from('cards').delete().eq('id', card.id)
      if (error) throw error
      setCards(prev => prev.filter(c => c.id !== card.id))
    } catch (e: any) {
      alert(`Delete failed: ${e.message ?? e}`)
    }
  }

  if (loading) return <div className="p-4">Loading…</div>
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold">My Cards</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sort</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="created_at">Newest</option>
            <option value="player">Player</option>
            <option value="year">Year</option>
            <option value="brand">Brand</option>
            <option value="card_no">Card #</option>
          </select>
          <button
            className="border rounded px-2 py-1 text-sm"
            onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
            title="Toggle sort direction"
          >
            {sortDir === 'asc' ? '▲' : '▼'}
          </button>
          <Link
            href="/add"
            className="rounded bg-indigo-600 text-white px-3 py-1 text-sm"
          >
            + Add Card
          </Link>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div>No cards yet. Add your first card.</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((c) => {
            const title = `${c.year ?? ''} ${c.brand ?? ''} #${c.card_no ?? ''}`.trim()
            const player = playerFullName(c.player) || 'Unknown'
            const graded = c.is_graded
              ? `${c.grading_company ?? ''} ${c.grade ?? ''}${
                  c.grading_no ? ` (#${c.grading_no})` : ''
                }`.trim()
              : 'Raw'

            return (
              <div key={c.id} className="border rounded p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{player}</div>
                    <div className="text-gray-600 text-sm">{title}</div>
                    <div className="text-gray-500 text-sm mt-1">{graded}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link
                      href={`/card/${c.id}`}
                      className="border rounded px-2 py-1 text-sm"
                      title="Details"
                    >
                      Details
                    </Link>
                    <button
                      onClick={() => handleDelete(c)}
                      className="border rounded px-2 py-1 text-sm text-red-600"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}