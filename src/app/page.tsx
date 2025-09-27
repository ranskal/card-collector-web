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
type FilterKey = 'sport' | 'player' | 'year' | 'type' | null
type TypeFilter = '' | 'graded' | 'raw'

function publicUrl(path: string) {
  return supabase.storage.from('card-images').getPublicUrl(path).data.publicUrl
}

function Pill({
  active,
  children,
  onClick,
  title,
}: {
  active?: boolean
  children: React.ReactNode
  onClick: () => void
  title?: string
}) {
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
  const [sportFilter, setSportFilter] = useState<string>('')   // '' = All
  const [playerFilter, setPlayerFilter] = useState<string>('') // '' = All
  const [yearFilter, setYearFilter] = useState<string>('')     // '' = All
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('') // '' | 'graded' | 'raw'

  // pop-up state
  const [openFilter, setOpenFilter] = useState<FilterKey>(null)

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

  // Filter option lists
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

  // Apply filters (now includes Type)
  const filtered = useMemo(() => {
    return cards.filter(c => {
      const sportOk  = !sportFilter  || c.sport === sportFilter
      const playerOk = !playerFilter || (c.player?.full_name === playerFilter)
      const yearOk   = !yearFilter   || (c.year === Number(yearFilter))
      const typeOk   = !typeFilter   ||
        (typeFilter === 'graded' ? c.is_graded === true : c.is_graded !== true)
      return sportOk && playerOk && yearOk && typeOk
    })
  }, [cards, sportFilter, playerFilter, yearFilter, typeFilter])

  // Apply sort (default combined: Player → Year → Brand → Number, all ASC)
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
      if (sortBy === 'year')   return cmpNumAsc(a.year, b.year)
      if (sortBy === 'brand')  return cmpStr(a.brand, b.brand)
      return cmpCardNo(a.card_no, b.card_no) // 'number'
    })
    return list
  }, [filtered, sortBy])

  // Delete (permission-checked)
  async function handleDelete(card: CardRow) {
    const label =
      `${card.player?.full_name || 'Unknown Player'} • ` +
      (`${[card.year && String(card.year), card.brand, card.card_no && `#${card.card_no}`]
        .filter(Boolean)
        .join(' ')}` || '—')

    const ok = confirm(`Delete: ${label}?\n\nThis will remove the card and its photo(s).`)
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

  // ----- pill labels -----
  const sportLabel  = sportFilter  ? `Sport: ${sportFilter}`   : 'Sport: All'
  const playerLabel = playerFilter ? `Player: ${playerFilter}` : 'Player: All'
  const yearLabel   = yearFilter   ? `Year: ${yearFilter}`     : 'Year: All'
  const typeLabel   = typeFilter
    ? `Type: ${typeFilter === 'graded' ? 'Graded' : 'Raw'}`
    : 'Type: All'

  // ----- open / close -----
  function openFilterDialog(key: Exclude<FilterKey, null>) { setOpenFilter(key) }
  function closeDialog() { setOpenFilter(null) }

  // immediate choose on click (maps Type labels to values)
  function chooseFilter(val: string) {
    if (openFilter === 'sport')  setSportFilter(val)
    if (openFilter === 'player') setPlayerFilter(val)
    if (openFilter === 'year')   setYearFilter(val)
    if (openFilter === 'type') {
      if (val === '' || val === 'All') setTypeFilter('')
      else if (val === 'Graded' || val === 'graded') setTypeFilter('graded')
      else if (val === 'Raw' || val === 'raw') setTypeFilter('raw')
    }
    closeDialog()
  }

  // Build option list for current popup
  const currentOptions: string[] = useMemo(() => {
    if (openFilter === 'sport')  return sportOptions
    if (openFilter === 'player') return playerOptions
    if (openFilter === 'year')   return yearOptions.map(String)
    if (openFilter === 'type')   return ['All', 'Graded', 'Raw']
    return []
  }, [openFilter, sportOptions, playerOptions, yearOptions])

  // Current selected value (for highlight)
  const currentValue =
    openFilter === 'sport'  ? sportFilter :
    openFilter === 'player' ? playerFilter :
    openFilter === 'year'   ? yearFilter :
    openFilter === 'type'   ? (typeFilter ? (typeFilter === 'graded' ? 'Graded' : 'Raw') : '') :
    ''

  return (
    <div className="space-y-4">
      {/* Sort row */}
      <div className="-mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span>Sort:</span>
        <Pill active={sortBy==='combined'} onClick={()=>setSortBy('combined')} title="Player → Year → Brand → #">Default</Pill>
        <Pill active={sortBy==='player'} onClick={()=>setSortBy('player')}>Player</Pill>
        <Pill active={sortBy==='year'}   onClick={()=>setSortBy('year')}>Year</Pill>
        <Pill active={sortBy==='brand'}  onClick={()=>setSortBy('brand')}>Brand</Pill>
        <Pill active={sortBy==='number'} onClick={()=>setSortBy('number')}>Number</Pill>
      </div>

      {/* Filter pills (now includes Type) */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-600">Filter:</span>
        <Pill active={!!sportFilter}  onClick={()=>openFilterDialog('sport')}>{sportLabel}</Pill>
        <Pill active={!!playerFilter} onClick={()=>openFilterDialog('player')}>{playerLabel}</Pill>
        <Pill active={!!yearFilter}   onClick={()=>openFilterDialog('year')}>{yearLabel}</Pill>
        <Pill active={!!typeFilter}   onClick={()=>openFilterDialog('type')}>{typeLabel}</Pill>

        <button
          onClick={() => { setSportFilter(''); setPlayerFilter(''); setYearFilter(''); setTypeFilter('') }}
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

      {/* List (thumb a little bigger: 64px) */}
      <div className="space-y-2">
        {sorted.map((c) => {
          const imgs = Array.isArray(c.card_images) ? c.card_images : []
          const chosen = imgs.find((i) => i.is_primary) ?? imgs[0]
          const url = chosen ? publicUrl(chosen.storage_path) : null
          const title = `${c.year ?? ''} ${c.brand ?? ''} #${c.card_no ?? ''}`.trim()
          const chip = c.is_graded
            ? `${c.grading_company ?? ''} ${c.grade ?? ''}${c.grading_no ? ` (#${c.grading_no})` : ''}`.trim()
            : 'Raw'

          return (
            <div key={c.id} className="card p-2">
              <div className="flex items-center gap-2">
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
                  <div className="truncate text-sm font-semibold">
                    {c.player?.full_name || 'Unknown Player'}
                  </div>
                  <div className="truncate text-xs text-slate-600">{title}</div>
                  <div className="mt-1">
                    <span className="pill px-2 py-0.5 text-[11px]">
                      {chip || 'Raw'}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Link
                    href={`/card/${c.id}`}
                    title="Details"
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                  >
                    Details
                  </Link>
                  <button
                    onClick={() => handleDelete(c)}
                    title="Delete"
                    className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
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
            <button className="link" onClick={() => { setSportFilter(''); setPlayerFilter(''); setYearFilter(''); setTypeFilter('') }}>
              Clear filters
            </button>.
          </div>
        )}
      </div>

      {/* --- Filter pop-up (click option to apply immediately) --- */}
      {openFilter && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={closeDialog}>
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-sm font-semibold text-slate-800">
              {openFilter === 'sport' ? 'Select Sport'
               : openFilter === 'player' ? 'Select Player'
               : openFilter === 'year' ? 'Select Year'
               : 'Select Type'}
            </div>

            <div className="max-h-[50vh] overflow-auto space-y-2">
              {/* All option */}
              <button
                onClick={() => chooseFilter('')}
                className={[
                  'w-full text-left rounded-lg border px-3 py-2',
                  currentValue === '' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'
                ].join(' ')}
              >
                All
              </button>

              {/* Options */}
              {currentOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => chooseFilter(opt)}
                  className={[
                    'w-full text-left rounded-lg border px-3 py-2',
                    currentValue === opt ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50'
                  ].join(' ')}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="mt-3 flex justify-end">
              <button className="btn" onClick={closeDialog}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}