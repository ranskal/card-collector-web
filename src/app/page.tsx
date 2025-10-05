// src/app/page.tsx
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
  card_tags?: { tags?: { label?: string | null } | null }[] | null
}

type FilterKey = 'sport' | 'player' | 'year' | 'type' | 'tags' | null
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

// --- sorting helpers (internal only, no UI) ---
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

/** Apply filters; any key omitted/undefined is ignored (used for “exclude this dim” counts). */
function applyFilters(
  list: CardRow[],
  opts: {
    sport?: string
    player?: string
    year?: string
    type?: TypeFilter
    tags?: string[] // AND match: card must include all selected tags
  }
) {
  const { sport, player, year, type, tags } = opts
  return list.filter((c) => {
    const sportOk = sport === undefined || !sport || c.sport === sport
    const playerOk =
      player === undefined || !player || c.player?.full_name === player
    const yearOk =
      year === undefined || !year || c.year === Number(year)
    const typeOk =
      type === undefined ||
      !type ||
      (type === 'graded' ? c.is_graded === true : c.is_graded !== true)

    // collect labels on the card
    const labels =
      (c.card_tags ?? [])
        .map((ct) => ct?.tags?.label)
        .filter(Boolean) as string[]
    const tagsOk =
      tags === undefined ||
      !tags?.length ||
      tags.every((t) => labels.includes(t))

    return sportOk && playerOk && yearOk && typeOk && tagsOk
  })
}

export default function HomePage() {
  const [cards, setCards] = useState<CardRow[]>([])
  const [loading, setLoading] = useState(true)

  // filters
  const [sportFilter, setSportFilter] = useState<string>('')   // '' = All
  const [playerFilter, setPlayerFilter] = useState<string>('') // '' = All
  const [yearFilter, setYearFilter] = useState<string>('')     // '' = All
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('') // '' | 'graded' | 'raw'
  const [tagFilter, setTagFilter] = useState<string[]>([])     // multi-select

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
          card_images(storage_path, is_primary),
          card_tags:card_tags(
            tags(label)
          )
        `)
        .order('created_at', { ascending: false })

      if (!active) return
      if (!error && data) setCards(data as unknown as CardRow[])
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  // Option lists
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

  const tagOptions = useMemo(() => {
    const set = new Set<string>()
    cards.forEach(c => {
      (c.card_tags ?? []).forEach(ct => {
        const label = ct?.tags?.label
        if (label) set.add(label)
      })
    })
    return Array.from(set).sort((a,b)=>a.localeCompare(b))
  }, [cards])

  // Filtered + default combined sort (Player → Year → Brand → Number)
  const filtered = useMemo(() => {
    return applyFilters(cards, {
      sport: sportFilter,
      player: playerFilter,
      year: yearFilter,
      type: typeFilter,
      tags: tagFilter,
    })
  }, [cards, sportFilter, playerFilter, yearFilter, typeFilter, tagFilter])

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) =>
      cmpStr(a.player?.full_name, b.player?.full_name) ||
      cmpNumAsc(a.year, b.year) ||
      cmpStr(a.brand, b.brand) ||
      cmpCardNo(a.card_no, b.card_no)
    )
    return list
  }, [filtered])

  // ---- Counts for popups (respect other filters; exclude current dim) ----
  const typeCounts = useMemo(() => {
    const base = applyFilters(cards, {
      sport: sportFilter, player: playerFilter, year: yearFilter,
      type: undefined, tags: tagFilter
    })
    const graded = base.filter(c => c.is_graded === true).length
    const all = base.length
    return { all, graded, raw: all - graded }
  }, [cards, sportFilter, playerFilter, yearFilter, tagFilter])

  const sportCounts = useMemo(() => {
    const base = applyFilters(cards, {
      player: playerFilter, year: yearFilter, type: typeFilter,
      sport: undefined, tags: tagFilter
    })
    const by: Record<string, number> = {}
    for (const c of base) if (c.sport) by[c.sport] = (by[c.sport] ?? 0) + 1
    return { all: base.length, by }
  }, [cards, playerFilter, yearFilter, typeFilter, tagFilter])

  const playerCounts = useMemo(() => {
    const base = applyFilters(cards, {
      sport: sportFilter, year: yearFilter, type: typeFilter,
      player: undefined, tags: tagFilter
    })
    const by: Record<string, number> = {}
    for (const c of base) {
      const name = c.player?.full_name
      if (name) by[name] = (by[name] ?? 0) + 1
    }
    return { all: base.length, by }
  }, [cards, sportFilter, yearFilter, typeFilter, tagFilter])

  const yearCounts = useMemo(() => {
    const base = applyFilters(cards, {
      sport: sportFilter, player: playerFilter, type: typeFilter,
      year: undefined, tags: tagFilter
    })
    const by: Record<string, number> = {}
    for (const c of base) {
      if (typeof c.year === 'number') {
        const key = String(c.year)
        by[key] = (by[key] ?? 0) + 1
      }
    }
    return { all: base.length, by }
  }, [cards, sportFilter, playerFilter, typeFilter, tagFilter])

  const tagCounts = useMemo(() => {
    const base = applyFilters(cards, {
      sport: sportFilter, player: playerFilter, year: yearFilter,
      type: typeFilter, tags: undefined // ignore tags for counts
    })
    const by: Record<string, number> = {}
    for (const c of base) {
      const labels = (c.card_tags ?? [])
        .map(ct => ct?.tags?.label)
        .filter(Boolean) as string[]
      for (const l of labels) by[l] = (by[l] ?? 0) + 1
    }
    return { all: base.length, by }
  }, [cards, sportFilter, playerFilter, yearFilter, typeFilter])

  // Delete
  async function handleDelete(card: CardRow) {
    await ensureUser(); // make sure session exists in this tab
    
    const label =
      `${card.player?.full_name || 'Unknown Player'} • ` +
      (`${[
        card.year && String(card.year),
        card.brand,
        card.card_no && `#${card.card_no}`,
      ]
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

  // ----- pill labels (no counts in pills) -----
  const sportLabel  = sportFilter  ? `Sport: ${sportFilter}`   : 'Sport: All'
  const playerLabel = playerFilter ? `Player: ${playerFilter}` : 'Player: All'
  const yearLabel   = yearFilter   ? `Year: ${yearFilter}`     : 'Year: All'
  const typeLabel   = typeFilter
    ? `Type: ${typeFilter === 'graded' ? 'Graded' : 'Raw'}`
    : 'Type: All'
  const tagsLabel   = tagFilter.length ? `Tags: ${tagFilter.length} selected` : 'Tags: Any'

  // ----- open / close -----
  function openFilterDialog(key: Exclude<FilterKey, null>) { setOpenFilter(key) }
  function closeDialog() { setOpenFilter(null) }

  // choose for single-select filters (sport/player/year/type)
  function chooseFilter(val: string) {
    if (openFilter === 'sport')  setSportFilter(val)
    if (openFilter === 'player') setPlayerFilter(val)
    if (openFilter === 'year')   setYearFilter(val)
    if (openFilter === 'type') {
      if (val === '' || val === 'All') setTypeFilter('')
      else if (val === 'Graded' || val === 'graded') setTypeFilter('graded')
      else if (val === 'Raw' || val === 'raw') setTypeFilter('raw')
    }
    if (openFilter !== 'tags') closeDialog()
  }

  // toggle for tags (multi-select, stays open)
  function toggleTag(tag: string) {
    setTagFilter(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }
  function clearTags() { setTagFilter([]) }

  // Options for current popup
  const currentOptions: string[] = useMemo(() => {
    if (openFilter === 'sport')  return sportOptions
    if (openFilter === 'player') return playerOptions
    if (openFilter === 'year')   return yearOptions.map(String)
    if (openFilter === 'type')   return ['Graded', 'Raw']
    if (openFilter === 'tags')   return tagOptions
    return []
  }, [openFilter, sportOptions, playerOptions, yearOptions, tagOptions])

  // Current value for highlight (single-select)
  const currentValue =
    openFilter === 'sport'  ? sportFilter :
    openFilter === 'player' ? playerFilter :
    openFilter === 'year'   ? yearFilter :
    openFilter === 'type'   ? (typeFilter ? (typeFilter === 'graded' ? 'Graded' : 'Raw') : '') :
    ''

  // Count for “All” in popup
  const allCountForOpen =
    openFilter === 'sport'  ? sportCounts.all :
    openFilter === 'player' ? playerCounts.all :
    openFilter === 'year'   ? yearCounts.all :
    openFilter === 'type'   ? typeCounts.all :
    openFilter === 'tags'   ? tagCounts.all :
    0

  return (
    <div className="space-y-4">
      {/* Pinned Filters only (no Sort UI) */}
      <div className="sticky top-16 z-20 -mx-4 border-b border-slate-200/60 bg-slate-50/90 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">Filter:</span>
          <Pill active={!!sportFilter}  onClick={()=>openFilterDialog('sport')}>{sportLabel}</Pill>
          <Pill active={!!playerFilter} onClick={()=>openFilterDialog('player')}>{playerLabel}</Pill>
          <Pill active={!!yearFilter}   onClick={()=>openFilterDialog('year')}>{yearLabel}</Pill>
          <Pill active={!!typeFilter}   onClick={()=>openFilterDialog('type')}>{typeLabel}</Pill>
          <Pill active={tagFilter.length>0} onClick={()=>openFilterDialog('tags')}>{tagsLabel}</Pill>

          <button
            onClick={() => { setSportFilter(''); setPlayerFilter(''); setYearFilter(''); setTypeFilter(''); setTagFilter([]) }}
            className="btn btn-outline ml-auto"
            title="Clear filters"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Count */}
      {!loading && (
        <div className="text-xs text-slate-500">{sorted.length} card{sorted.length===1?'':'s'}</div>
      )}
      {loading && (
        <div className="py-16 text-center text-slate-500">Loading…</div>
      )}

      {/* List */}
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
            <button className="link" onClick={() => { setSportFilter(''); setPlayerFilter(''); setYearFilter(''); setTypeFilter(''); setTagFilter([]) }}>
              Clear filters
            </button>.
          </div>
        )}
      </div>

      {/* --- Filter pop-up --- */}
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
               : openFilter === 'type' ? 'Select Type'
               : 'Select Tags'}
            </div>

            <div className="max-h-[50vh] overflow-auto space-y-2">
              {/* All / Any option with count */}
              <button
                onClick={() => {
                  if (openFilter === 'tags') clearTags()
                  else chooseFilter('')
                }}
                className={[
                  'w-full text-left rounded-lg border px-3 py-2',
                  (openFilter === 'tags'
                    ? tagFilter.length === 0
                    : (openFilter === 'type'
                        ? (currentValue === '' || currentValue === 'All')
                        : currentValue === '')
                  )
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 hover:bg-slate-50'
                ].join(' ')}
              >
                {openFilter === 'tags' ? 'Any' : 'All'} ({allCountForOpen})
              </button>

              {/* Options with counts */}
              {currentOptions.map((opt) => {
                let count = 0
                if (openFilter === 'type') {
                  count = opt === 'Graded' ? typeCounts.graded : typeCounts.raw
                } else if (openFilter === 'sport') {
                  count = sportCounts.by[opt] ?? 0
                } else if (openFilter === 'player') {
                  count = playerCounts.by[opt] ?? 0
                } else if (openFilter === 'year') {
                  count = yearCounts.by[opt] ?? 0
                } else if (openFilter === 'tags') {
                  count = tagCounts.by[opt] ?? 0
                }

                const isActive =
                  openFilter === 'tags'
                    ? tagFilter.includes(opt)
                    : currentValue === opt

                return (
                  <button
                    key={opt}
                    onClick={() => {
                      if (openFilter === 'tags') toggleTag(opt)
                      else chooseFilter(opt)
                    }}
                    className={[
                      'w-full text-left rounded-lg border px-3 py-2',
                      isActive
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 hover:bg-slate-50'
                    ].join(' ')}
                  >
                    {openFilter === 'tags' && (isActive ? '✓ ' : '')}
                    {opt} ({count})
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex justify-end gap-2">
              {openFilter === 'tags' && (
                <button className="btn btn-outline" onClick={clearTags}>Clear</button>
              )}
              <button className="btn" onClick={closeDialog}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}