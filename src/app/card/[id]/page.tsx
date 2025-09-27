'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { publicUrl } from '@/lib/storage'

type CardImage = { storage_path: string; is_primary?: boolean | null }

export default function CardDetails() {
  const params = useParams<{ id: string }>()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id

  const [card, setCard] = useState<any | null>(null)
  const [current, setCurrent] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancel = false
    ;(async () => {
      const { data, error } = await supabase
        .from('cards')
        .select(`
          id, year, brand, card_no, sport,
          is_graded, grade, grading_company, grading_no,
          player:players(full_name),
          card_images(storage_path, is_primary)
        `)
        .eq('id', id)
        .maybeSingle()

      if (cancel) return
      if (error) {
        console.error('[card details] fetch error:', error.message)
        setCard(null)
        return
      }
      const c = (data as any) ?? null
      setCard(c)

      const imgs: CardImage[] = Array.isArray(c?.card_images) ? c.card_images : []
      const idx = imgs.findIndex((i) => !!i?.is_primary)
      setCurrent(idx >= 0 ? idx : 0)
    })()
    return () => { cancel = true }
  }, [id])

  // Keyboard nav only in lightbox
  useEffect(() => {
    if (!lightbox) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(false)
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox])

  if (!id)   return <div className="py-16 text-center text-slate-500">Missing id.</div>
  if (!card) return <div className="py-16 text-center text-slate-500">Loading…</div>

  const imgs: CardImage[] = Array.isArray(card.card_images) ? card.card_images : []
  const urls = useMemo(() => imgs.map((i) => publicUrl(i.storage_path)).filter(Boolean), [imgs])
  const hasMany = urls.length > 1
  const safeCurrent = Math.min(Math.max(current, 0), Math.max(urls.length - 1, 0))
  const hero = urls[safeCurrent] // string | undefined

  const title  = `${card.year ?? ''} ${card.brand ?? ''} #${card.card_no ?? ''}`.trim()
  const player = card.player?.full_name || 'Unknown Player'
  const cert   = card.grading_no ? ` #${card.grading_no}` : ''
  const graded =
    card.is_graded && (card.grading_company || card.grade)
      ? `${card.grading_company ?? ''} ${card.grade ?? ''}${cert}`.trim()
      : 'Raw'

  function prev() {
    if (!urls.length) return
    setCurrent((i) => (i - 1 + urls.length) % urls.length)
  }
  function next() {
    if (!urls.length) return
    setCurrent((i) => (i + 1) % urls.length)
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Back */}
      <div className="mb-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← Back</Link>
      </div>

      {/* Full-width hero image with carousel + click-to-zoom */}
      {hero ? (
        <div className="mx-auto w-full">
          <div className="relative overflow-hidden rounded-xl border bg-white">
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="block w-full"
              title="Click to view larger"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero}
                alt={title || 'card'}
                className="w-full h-auto object-contain cursor-zoom-in"
                loading="eager"
              />
            </button>

            {hasMany && (
              <>
                <button
                  onClick={prev}
                  aria-label="Previous"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 border border-slate-200 p-2 shadow hover:bg-white"
                >
                  ‹
                </button>
                <button
                  onClick={next}
                  aria-label="Next"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 border border-slate-200 p-2 shadow hover:bg-white"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {hasMany && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {urls.map((u, idx) => (
                <button
                  key={u + idx}
                  onClick={() => setCurrent(idx)}
                  className={[
                    'relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border',
                    idx === safeCurrent ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-slate-200'
                  ].join(' ')}
                  title={`Image ${idx + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="h-full w-full object-contain bg-white" />
                </button>
              ))}
            </div>
          )}
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

      {/* Lightbox modal — only render if hero exists */}
      {lightbox && hero && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-[96vw] max-w-5xl h-[88vh] rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(false)}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded-full bg-white/90 border border-slate-200 px-3 py-1 text-sm shadow hover:bg-white"
            >
              Close
            </button>

            {urls.length > 1 && (
              <>
                <button
                  onClick={prev}
                  aria-label="Previous"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/90 border border-slate-200 p-3 shadow hover:bg-white"
                >
                  ‹
                </button>
                <button
                  onClick={next}
                  aria-label="Next"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/90 border border-slate-200 p-3 shadow hover:bg-white"
                >
                  ›
                </button>
              </>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt={title || 'card'} className="absolute inset-0 h-full w-full object-contain bg-black" />
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'primary' }) {
  const styles = tone === 'primary' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles}`}>{children}</span>
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value || '—'}</span>
    </div>
  )
}