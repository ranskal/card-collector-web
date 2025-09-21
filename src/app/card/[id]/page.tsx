'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { publicUrl } from '@/lib/storage'
import { ensureUser } from '@/lib/auth'

export default function CardDetails() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [card, setCard] = useState<any>(null)

  useEffect(() => {
    (async () => {
      await ensureUser()
      const { data } = await supabase
        .from('cards')
        .select(`
          id, year, brand, card_no, is_graded, grade, grading_company, grading_no, sport,
          player:players(full_name),
          card_images(storage_path, is_primary)
        `)
        .eq('id', id).maybeSingle()
      if (data) setCard(data)
    })()
  }, [id])

  if (!card) return <p>Loading…</p>

  const imgs = Array.isArray(card.card_images) ? card.card_images : []
  const urls = imgs.map((i: any) => publicUrl(i.storage_path))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">{card.player?.full_name} • {card.year} {card.brand}</h1>

      {urls.length > 0 && (
        <div className="flex gap-3 overflow-x-auto">
          {urls.map((u: string, i: number) => (
            <img key={i} src={u} className="h-64 rounded-xl border object-contain bg-slate-100" />
          ))}
        </div>
      )}

      <div className="rounded-xl border bg-white p-4 space-y-2">
        <div className="text-slate-600">{card.sport}</div>
        <div>Card #: {card.card_no ?? '—'}</div>
        {card.is_graded ? (
          <div className="text-sm text-slate-700">
            {card.grading_company} {card.grade} {card.grading_no ? ` (#${card.grading_no})` : ''}
          </div>
        ) : <div className="text-sm text-slate-700">Raw</div>}
      </div>
    </div>
  )
}