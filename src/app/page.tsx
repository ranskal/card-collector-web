'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ensureUser } from '@/lib/auth'
import { publicUrl } from '@/lib/storage'

export default function Home() {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const user = await ensureUser()
      const { data, error } = await supabase
        .from('cards')
        .select(`
          id, year, brand, card_no, is_graded, grade, grading_company,
          player:players(full_name),
          card_images(storage_path, is_primary)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
      if (!error && data) setCards(data)
      setLoading(false)
    })()
  }, [])

  return (
    <div className="space-y-4">
      <Link href="/add" className="inline-block rounded-xl bg-indigo-600 px-4 py-2 text-white font-semibold">
        + Add Card
      </Link>

      {loading ? <p>Loading…</p> : cards.length === 0 ? (
        <p>No cards yet. Add your first card.</p>
      ) : (
        <ul className="space-y-3">
          {cards.map((c) => {
            const imgs = Array.isArray(c.card_images) ? c.card_images : []
            const chosen = imgs.find((i: any) => i.is_primary) || imgs[0]
            const thumb = chosen ? publicUrl(chosen.storage_path) : undefined
            return (
              <li key={c.id}>
                <Link href={`/card/${c.id}`} className="flex gap-3 rounded-xl border bg-white p-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border">
                    {thumb && <img src={thumb} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{c.player?.full_name ?? 'Unknown Player'}</div>
                    <div className="text-slate-600 text-sm">
                      {`${c.year ?? ''} ${c.brand ?? ''} #${c.card_no ?? ''}`.trim()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {c.is_graded ? `${c.grading_company ?? ''} ${c.grade ?? ''}` : 'Raw'}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}