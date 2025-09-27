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
  sport: string | null
  is_graded: boolean | null
  grading_company: string | null
  grading_no: string | null
  grade: number | null
  player: { full_name?: string } | null
  card_images: { storage_path: string; is_primary?: boolean | null }[]
}

type SortMode = 'combined' | 'player' | 'year' | 'brand' | 'number'

function publicUrl(path: string) {
  return supabase.storage.from('card-images').getPublicUrl(path).data.publicUrl
}

function Pill({ active, children, onClick, title }: { active?: boolean; children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        'pill',
        active ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// --- comparators ---
const s = (v: unknown) => (v ?? '').toString()
const cmpStr = (a?: string | null, b?: string | null) =>
  s(a).localeCompare(s(b), undefined, { sensitivity: 'base', numeric: true })

const cmpNumAsc = (a?: number | null, b?: number | null) => {
  const A = a ?? Number.MAX_SAFE_INTEGER
  const B = b ?? Number.MAX_SAFE_INTEGER
  return A - B
}

const cmpCardNo = (a?: string | null, b?: string | null) => {
  const na = parseInt((a ?? '').replace(/[^\d]/g, ''), 10)
  const nb = parseInt((b ?? '').replace(/[^\d]/g, ''), 10)
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
  return cmpStr(a, b)
}

export default function HomePage() {
  const [cards, setCards] = useState<CardRow[]>([])
  const [loading, setLoading] = useState(true)

  // sort + filters
  const [sortBy, setSortBy] = useState<SortMode>('combined')
  const [sportFilter, setSportFilter] = useState<string>('')  // '' = All
  const [playerFilter, setPlayerFilter] = useState<string>('')
  const [yearFilter, setYearFilter] = useState<string>('')

  useEffect(() => {
    let active = true
    ;(async () => {
      await ensureUser()
      const { data, error } = await supabase
        .from('cards')
        .select(`
          id, created_at, year, brand, card_no, sport,
          is_graded, grading_company, grading_no, grade,
          player:players(full_name),
          card_images(storage_path, is_primary)
        `)
        .order('created_at', { ascending: false })

      if (!active) return
      if (!error && data) setCards(data as unknown as CardRow[])
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  // Build filter option lists from data
  const sportOptions = useMemo(() => {
    const set = new Set<string>()
    cards.forEach(c => { if (c.sport) set.add(c.sport) })
    return Array.from(set).sort()
  }, [cards])

  const playerOptions = useMemo(() => {
    const set = new Set<string>()
    cards.forEach(c => { const n = c.player?.full_name; if (n) set.add(n) })
    return Array.from(set).sort((a,b)=>a.localeCompare(b))
  }, [cards])

  const yearOptions = useMemo(() => {
    const set = new Set<number>()
    cards.forEach(c => { if (typeof c.year === 'number') set.add(c.year) })
    return Array.from(set).sort((a,b)=>a-b)
  }, [cards])

  // Apply filters
  const filtered = useMemo(() => {
    return cards.filter(c => {
      const sportOk = !sportFilter || c.sport === sportFilter
      const playerOk = !playerFilter || (c.player?.full_name === playerFilter)
      const yearOk = !yearFilter || (c.year === Number(yearFilter))
      return sportOk && playerOk && yearOk
    })
  }, [cards, sportFilter, playerFilter, yearFilter])

  // Apply sort
  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      if (sortBy === 'combined') {
        return (
          cmpStr(a.player?.full_name, b.player?.full_name) ||
          cmpNumAsc(a.year, b.year) ||
          cmpStr(a.brand, b.brand) ||
          cmpCardNo(a.card_no, b.card_no)
        )
      }
      if (sortBy === 'player') return cmpStr(a.player?.full_name, b.player?.full_name)
      if (sortBy === 'year') return cmpNumAsc(a.year, b.year)
      if (sortBy === 'brand') return cmpStr(a.brand, b.brand)
      return cmpCardNo(a.card_no, b.card_no) // 'number'
    })
    return list
  }, [filtered, sortBy])

  // Delete (keeps your permission check)
  async function handleDelete(card: CardRow) {
    const label = [
      card.player?.full_name ?? 'Unknown Player',
      card.year ? String(card.year) : '—',
      card.brand ?? '—',
      card.card_no ? `#${card.card_no}` : undefined,
    ].filter(Boolean).join(' • ')

    const ok = confirm(`Delete ${label}?\n\nThis will remove the card and its photo(s).`)
    if (!ok) return

    const { data: deleted, error } = await supabase
      .from('cards')
      .delete()
      .eq('id', card.id)
      .select('id')

    if (error) {
      alert(`Delete failed: ${error.message}`)
      return
    }
    if (!deleted || deleted.length === 0) {
      alert(`Could not delete “${label}”. You may not have permission (different session/user).`)
      return
    }

    const paths = (card.card_images ?? []).map(i => i.storage_path).filter(Boolean) as string[]
    if (paths.length) {
      try { await supabase.storage.from('card-images').remove(paths) } catch {}
    }
    setCards(prev => prev.filter(c => c.id !== card.id))
  }

  return (
    <div className="space-y-4">
      {/* Sort row */}
      <div className="-mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span>Sort:</span>
        <Pill active={sortBy==='combined'} onClick={()=>setSortBy('combined')} title="Player → Year → Brand → #">Default</Pill>
        <Pill active={sortBy==='player'} onClick={()=>setSortBy('player')}>Player</Pill>
        <Pill active={sortBy==='year'} onClick={()=>setSortBy('year')}>Year</Pill>
        <Pill active={sortBy==='brand'} onClick={()=>setSortBy('brand')}>Brand</Pill>
        <Pill active={sortBy==='number'} onClick={()=>setSortBy('number')}>Number</Pill>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex min-w-[160px] flex-col">
          <label className="text-xs font-semibold text-slate-600">Sport</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={sportFilter}
            onChange={(e)=>setSportFilter(e.target.value)}
          >
            <option value="">All</option>
            {sportOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex min-w-[200px] flex-col">
          <label className="text-xs font-semibold text-slate-600">Player</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={playerFilter}
            onChange={(e)=>setPlayerFilter(e.target.value)}
          >
            <option value="">All</option>
            {playerOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="flex min-w-[140px] flex-col">
          <label className="text-xs font-semibold text-slate-600">Year</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={yearFilter}
            onChange={(e)=>setYearFilter(e.target.value)}
          >
            <option value="">All</option>
            {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>

        <button
          onClick={() => { setSportFilter(''); setPlayerFilter(''); setYearFilter('') }}
          className="btn btn-outline ml-auto"
          title="Clear filters"
        >
          Clear
        </button>
      </div>

      {/* Count */}
      {!loading && (
        <div className="text-xs text-slate-500">{sorted.length} card{sorted.length===1?'':'s'}</div>
      )}

      {loading && (
        <div className="py-16 text-center text-slate-500">Loading…</div>
      )}

      {/* List */}
      <div className="space-y-3">
        {sorted.map((c) => {
          const imgs = Array.isArray(c.card_images) ? c.card_images : []
          const chosen = imgs.find((i) => i.is_primary) ?? imgs[0]
          const url = chosen ? publicUrl(chosen.storage_path) : null
          const title = `${c.year ?? ''} ${c.brand ?? ''} #${c.card_no ?? ''}`.trim()
          const chip = c.is_graded
            ? `${c.grading_company ?? ''} ${c.grade ?? ''}${c.grading_no ? ` (#${c.grading_no})` : ''}`.trim()
            : 'Raw'

          return (
            <div key={c.id} className="card p-3">
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {url && (
                    <Image
                      src={url}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-contain"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold">
                    {c.player?.full_name || 'Unknown Player'}
                  </div>
                  <div className="truncate text-sm text-slate-600">{title}</div>
                  <div className="mt-2">
                    <span className="pill">{chip || 'Raw'}</span>
                  </div>
                </div>

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
          )
        })}

        {!loading && sorted.length === 0 && (
          <div className="py-16 text-center text-slate-500">
            No cards match your filters.{' '}
            <button className="link" onClick={() => { setSportFilter(''); setPlayerFilter(''); setYearFilter('') }}>
              Clear filters
            </button>.
          </div>
        )}
      </div>
    </div>
  )
}