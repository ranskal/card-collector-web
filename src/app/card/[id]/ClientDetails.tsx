// src/app/card/[id]/ClientDetails.tsx
'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { publicUrl } from '@/lib/storage'
import { ensureUser } from '@/lib/auth'
import TagInput from '@/components/TagInput'

type Card = {
  id: string
  year: number | null
  brand: string | null
  card_no: string | null
  sport: string | null
  is_graded: boolean | null
  grade: number | null
  grading_company: string | null
  grading_no: string | null
  notes: string | null
  player: { full_name?: string } | null
  card_images: { storage_path: string; is_primary?: boolean | null }[] | null
}

export default function ClientDetails({ id }: { id: string }) {
  const router = useRouter()
  const sp = useSearchParams()

  const [card, setCard] = useState<Card | null>(null)
  const [idx, setIdx] = useState(0)
  const [open, setOpen] = useState(false)

  // tags + notes UI state
  const [tags, setTags] = useState<string[]>([])
  const [initialTags, setInitialTags] = useState<string[]>([])
  const [origTagIds, setOrigTagIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // --- helpers to (re)load the page data ---
  async function fetchCardAndTags() {
    // card
    const { data: c, error: cErr } = await supabase
      .from('cards')
      .select(`
        id, year, brand, card_no, sport,
        is_graded, grade, grading_company, grading_no, notes,
        player:players(full_name),
        card_images(storage_path, is_primary)
      `)
      .eq('id', id)
      .maybeSingle()
    if (cErr) throw cErr
    const cardRow = (c as unknown as Card) ?? null
    setCard(cardRow)
    setNotes(cardRow?.notes ?? '')

    // tags
    const { data: tagRows, error: tErr } = await supabase
      .from('card_tags')
      .select('tag_id, tags(label)')
      .eq('card_id', id)
    if (tErr) throw tErr

    const labels = (tagRows ?? [])
      .map((r: any) => r.tags?.label as string | undefined)
      .filter(Boolean) as string[]

    const ids = (tagRows ?? []).map((r: any) => r.tag_id as string)

    setTags(labels)
    setInitialTags(labels)
    setOrigTagIds(ids)
  }

  // initial load
  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        await fetchCardAndTags()
      } catch (e: any) {
        if (!cancel) alert(e.message ?? e)
      }
    })()
    return () => { cancel = true }
  }, [id])

  // pick the primary image by default
  useEffect(() => {
    if (!card) return
    const imgs = Array.isArray(card.card_images) ? card.card_images : []
    const primaryIndex = imgs.findIndex(i => i.is_primary)
    setIdx(primaryIndex === -1 ? 0 : primaryIndex)
  }, [card])

  // esc closes lightbox
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!card) return <div className="py-16 text-center text-slate-500">Loading…</div>

  const imgs = (Array.isArray(card.card_images) ? card.card_images : []) as {
    storage_path: string
    is_primary?: boolean | null
  }[]
  const urls = imgs.map(i => publicUrl(i.storage_path))
  const activeUrl = urls[idx]

  const title  = `${card.year ?? ''} ${card.brand ?? ''} #${card.card_no ?? ''}`.trim()
  const player = card.player?.full_name || 'Unknown Player'
  const graded =
    card.is_graded && (card.grading_company || card.grade)
      ? `${card.grading_company ?? ''} ${card.grade ?? ''}${card.grading_no ? ` (#${card.grading_no})` : ''}`.trim()
      : 'Raw'

  // --- SAVE TAGS + NOTES (with refresh signal for list page) ---
  async function saveTagsAndNotes() {
    if (!card) return
    setSaving(true)
    try {
      await ensureUser()

      const clean = Array.from(new Set(tags.map(t => t.trim()).filter(Boolean)))

        // Upsert tags → get desired IDs
        let desiredTagIds: string[] = [];
        if (clean.length) {
        const { data: up, error: upErr } = await supabase
            .from('tags')
            .upsert(clean.map(label => ({ label })), { onConflict: 'label' })
            .select('id,label');
        if (upErr) throw upErr;

        let tagRows = up ?? [];

        if (tagRows.length === 0) {
            const { data: fetched, error: fErr } = await supabase
            .from('tags')
            .select('id,label')
            .in('label', clean);
            if (fErr) throw fErr;
            tagRows = fetched ?? [];
        }

        desiredTagIds = tagRows.map((t: any) => t.id as string);
        }

      // Diff links
      const toRemove = origTagIds.filter(id => !desiredTagIds.includes(id))
      const toAdd = desiredTagIds.filter(id => !origTagIds.includes(id))

      if (toRemove.length) {
        const { error: delErr } = await supabase
          .from('card_tags')
          .delete()
          .eq('card_id', card.id)
          .in('tag_id', toRemove)
        if (delErr) throw delErr
      }
      if (toAdd.length) {
        const { error: insErr } = await supabase
          .from('card_tags')
          .insert(toAdd.map(tag_id => ({ card_id: card.id, tag_id })))
        if (insErr) throw insErr
      }

      // Update notes
      const nextNotes = notes.trim() ? notes.trim() : null
      const { error: nErr } = await supabase
        .from('cards')
        .update({ notes: nextNotes })
        .eq('id', card.id)
      if (nErr) throw nErr

      // ✅ tell the list page to refresh after back (covers iOS bfcache)
      try { localStorage.setItem('cards_last_update', String(Date.now())) } catch {}

      // Refresh local state so UI shows the saved data
      await fetchCardAndTags()
      setEditing(false)
    } catch (e: any) {
      alert(`Save failed: ${e.message ?? e}`)
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    setTags(initialTags)
    setNotes(card?.notes ?? '')
    setEditing(false)
  }

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      // fallback: preserve filters from current query if present
      const q = new URLSearchParams()
      const s = sp.get('sport');  if (s) q.set('sport', s)
      const p = sp.get('player'); if (p) q.set('player', p)
      const y = sp.get('year');   if (y) q.set('year', y)
      const t = sp.get('type');   if (t) q.set('type', t)
      const tags = sp.getAll('tags')
      if (tags.length) tags.forEach(tag => q.append('tags', tag))
      const qs = q.toString()
      router.push(qs ? `/?${qs}` : '/')
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      {/* Back */}
      <div className="mb-4">
        <button onClick={goBack} className="text-sm text-indigo-600 hover:underline">← Back</button>
      </div>

      {/* Hero */}
      {activeUrl ? (
        <>
          <div className="mx-auto w-[92%] sm:w-[88%] md:w-[85%]">
            <div
              className="relative w-full overflow-hidden rounded-2xl border bg-white cursor-zoom-in"
              onClick={() => setOpen(true)}
              title="Tap to view larger"
            >
              <div className="h-[48vh] sm:h-[52vh]">
                <Image
                  src={activeUrl}
                  alt={title || 'card'}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Thumbnails */}
          {urls.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {urls.map((u, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={[
                    'relative rounded-xl border bg-white',
                    'h-[72px] w-[72px] shrink-0 overflow-hidden',
                    i === idx ? 'ring-2 ring-indigo-500 border-indigo-300' : 'border-slate-200',
                  ].join(' ')}
                  title={`Photo ${i + 1}`}
                >
                  <Image src={u} alt="" fill sizes="72px" className="object-contain" />
                </button>
              ))}
            </div>
          )}
        </>
      ) : null}

      {/* Card panel */}
      <div className="mt-5 rounded-2xl border bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">{player}</h1>
        <p className="mt-1 text-slate-600">{title}</p>

        <div className="mt-3 flex gap-2 flex-wrap">
          <span className="pill">{card.sport || '—'}</span>
          <span className="pill whitespace-normal break-words">{graded}</span>
        </div>

        {/* Tags & Notes */}
        <div className="mt-5 border-t pt-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Tags & Notes</div>
            {!editing ? (
              <button className="text-xs rounded-lg border px-2 py-1 hover:bg-slate-50" onClick={() => setEditing(true)}>
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button className="text-xs rounded-lg border px-2 py-1 hover:bg-slate-50" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </button>
                <button
                  className="text-xs rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 px-2 py-1 hover:bg-indigo-100"
                  onClick={saveTagsAndNotes}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {!editing ? (
            <>
              <div className="flex flex-wrap gap-2">
                {initialTags.length ? (
                  initialTags.map(t => <span key={t} className="pill">{t}</span>)
                ) : (
                  <span className="text-sm text-slate-500">No tags</span>
                )}
              </div>
              <div className="mt-3">
                {card.notes ? (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{card.notes}</p>
                ) : (
                  <span className="text-sm text-slate-500">No notes</span>
                )}
              </div>
            </>
          ) : (
            <>
              <TagInput
                value={tags}
                onChange={setTags}
                placeholder="Add a tag and press Enter (e.g., RC, Auto)"
                suggestions={['RC','Auto','Refractor','Numbered','Patch','HOF']}
              />
              <textarea
                className="mt-3 w-full rounded border px-2 py-1 text-sm"
                rows={3}
                placeholder="Anything special about this card…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {open && activeUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-[min(95vw,1200px)] h-[min(90vh,1000px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image src={activeUrl} alt={title || 'card'} fill sizes="100vw" className="object-contain" />
          </div>
          <button
            className="absolute top-4 right-4 rounded-full bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
            onClick={() => setOpen(false)}
            title="Close"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}