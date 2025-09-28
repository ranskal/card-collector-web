'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ensureUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import CropperModal from '@/components/CropperModal'
import TagInput from '@/components/TagInput' // ⬅️ uses the component you added

type Player = { id: string; full_name: string }

const DEFAULT_SPORTS = ['Baseball', 'Basketball', 'Football', 'Hockey', 'Miscellaneous'] as const
const DEFAULT_BRANDS = ['Topps', 'Fleer', 'Donruss', 'Philadelphia'] as const
const DEFAULT_COMPANIES = ['PSA', 'SGC', 'BVG', 'Beckett', 'SWG', 'CGC'] as const

type LocalImg = { file: File; url: string; isPrimary: boolean }

export default function AddPage() {
  const router = useRouter()

  // players
  const [players, setPlayers] = useState<Player[]>([])
  const [playerChoice, setPlayerChoice] = useState<string>('') // id or '__OTHER__'
  const [newPlayer, setNewPlayer] = useState('')

  // sport / brand
  const [sports, setSports] = useState<string[]>([...DEFAULT_SPORTS])
  const [brands, setBrands] = useState<string[]>([...DEFAULT_BRANDS])
  const [sportChoice, setSportChoice] = useState<string>(sports[0])
  const [brandChoice, setBrandChoice] = useState<string>(brands[0])
  const [customSport, setCustomSport] = useState('')
  const [customBrand, setCustomBrand] = useState('')

  // fields
  const [year, setYear] = useState('')
  const [cardNo, setCardNo] = useState('')

  // grading
  const [isGraded, setIsGraded] = useState(false)
  const [companies, setCompanies] = useState<string[]>([...DEFAULT_COMPANIES])
  const [companyChoice, setCompanyChoice] = useState<string>('') // '' or company or '__OTHER__'
  const [customCompany, setCustomCompany] = useState('')
  const [gradingNo, setGradingNo] = useState('')
  const [grade, setGrade] = useState('')

  // tags + notes
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  // images (cropped files + previews)
  const [images, setImages] = useState<LocalImg[]>([])

  // ---- cropping queue state ----
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropQueue, setCropQueue] = useState<File[]>([])
  const [activeFile, setActiveFile] = useState<File | null>(null)
  const [tmpCardId] = useState(() => String(Date.now()))

  // load players
  useEffect(() => {
    ;(async () => {
      const u = await ensureUser()
      console.log('[add] user id:', u.id)
      const { data } = await supabase
        .from('players')
        .select('id, full_name')
        .order('full_name', { ascending: true })
      setPlayers(data ?? [])
      if (data && data.length) setPlayerChoice(data[0].id)
    })()
  }, [])

  const showNewPlayer = playerChoice === '__OTHER__'
  const showNewSport = sportChoice === '__OTHER_SPORT__'
  const showNewBrand = brandChoice === '__OTHER_BRAND__'
  const showNewCompany = isGraded && companyChoice === '__OTHER_COMPANY__'

  // add custom values inline
  function addSport() {
    const s = customSport.trim()
    if (!s) return
    if (!sports.includes(s)) setSports(prev => [...prev, s])
    setSportChoice(s)
    setCustomSport('')
  }
  function addBrand() {
    const b = customBrand.trim()
    if (!b) return
    if (!brands.includes(b)) setBrands(prev => [...prev, b])
    setBrandChoice(b)
    setCustomBrand('')
  }
  function addCompany() {
    const c = customCompany.trim()
    if (!c) return
    if (!companies.includes(c)) setCompanies(prev => [...prev, c])
    setCompanyChoice(c)
    setCustomCompany('')
  }

  // ---- image picking + crop flow ----
  function openPicker() { fileInputRef.current?.click() }
  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setCropQueue(files)
    setActiveFile(files[0])
  }
  async function handleCropped(blob: Blob) {
    const croppedFile = new File([blob], `crop-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' })
    const url = URL.createObjectURL(croppedFile)
    setImages(prev => {
      const isFirst = prev.length === 0
      return [...prev, { file: croppedFile, url, isPrimary: isFirst }]
    })
    setCropQueue(q => { const [, ...rest] = q; setActiveFile(rest[0] ?? null); return rest })
  }
  function cancelCrop() {
    setCropQueue(q => { const [, ...rest] = q; setActiveFile(rest[0] ?? null); return rest })
  }
  function makePrimary(i: number) { setImages(prev => prev.map((im, idx) => ({ ...im, isPrimary: idx === i }))) }
  function removeImage(i: number) {
    setImages(prev => {
      const next = prev.filter((_, idx) => idx !== i)
      if (next.length && !next.some(n => n.isPrimary)) next[0].isPrimary = true
      return next
    })
  }
  function clearImages() {
    setImages(prev => { prev.forEach(p => URL.revokeObjectURL(p.url)); return [] })
  }

  // save to DB
  async function save() {
    try {
      const u = await ensureUser()

      // resolve player id
      let playerId = playerChoice
      if (!playerId || playerId === '__OTHER__') {
        const name = newPlayer.trim()
        if (!name) return alert('Please enter a player name.')
        const { data: existing } = await supabase.from('players').select('id').eq('full_name', name).maybeSingle()
        if (existing) {
          playerId = existing.id
        } else {
          const { data: inserted, error } = await supabase.from('players').insert({ full_name: name }).select().single()
          if (error || !inserted) throw error ?? new Error('Failed to insert player')
          playerId = inserted.id
          setPlayers(prev => [...prev, { id: inserted.id, full_name: name }].sort((a,b)=>a.full_name.localeCompare(b.full_name)))
        }
      }

      if (!year.trim() || isNaN(+year)) return alert('Year must be a number.')

      // resolve graded company if needed
      let gradingCompany: string | null = null
      if (isGraded) {
        if (!companyChoice) return alert('Select a grading company or choose Other…')
        gradingCompany = companyChoice === '__OTHER_COMPANY__' ? (customCompany.trim() || null) : companyChoice
        if (!gradingCompany) return alert('Enter a grading company.')
      }

      // create card (includes notes)
      const { data: card, error: cErr } = await supabase
        .from('cards')
        .insert({
          player_id: playerId,
          sport: showNewSport ? customSport.trim() : sportChoice,
          brand: showNewBrand ? customBrand.trim() : brandChoice,
          year: parseInt(year, 10),
          card_no: cardNo || null,
          is_graded: isGraded,
          grading_company: gradingCompany,
          grading_no: isGraded ? (gradingNo || null) : null,
          grade: isGraded && grade ? Number(grade) : null,
          notes: notes.trim() ? notes.trim() : null,    // ⬅️ requires cards.notes column
        })
        .select()
        .single()
      if (cErr || !card) throw cErr ?? new Error('Failed to insert card')

      // upsert tags and link to card (requires unique index on tags.label)
      if (tags.length) {
        const clean = Array.from(new Set(tags.map(t => t.trim()).filter(Boolean)))
        if (clean.length) {
          const { data: tagRows, error: tagErr } = await supabase
            .from('tags')
            .upsert(clean.map(label => ({ label })), { onConflict: 'label' })
            .select()
          if (tagErr) throw tagErr
          const tagIds = (tagRows ?? []).map((t: any) => t.id)
          if (tagIds.length) {
            const payload = tagIds.map((tag_id: string) => ({ card_id: card.id, tag_id }))
            const { error: linkErr } = await supabase.from('card_tags').insert(payload)
            if (linkErr) throw linkErr
          }
        }
      }

      // upload images + rows
      if (images.length) {
        const uploadedPaths: { path: string; isPrimary: boolean }[] = []
        for (let i = 0; i < images.length; i++) {
          const img = images[i]
          const ext = img.file.name.split('.').pop()?.toLowerCase() || 'jpg'
          const path = `${u.id}/${tmpCardId}/${Date.now()}-${i}.${ext}`
          const { error } = await supabase.storage.from('card-images').upload(
            path, img.file, { upsert: false, contentType: img.file.type || 'image/jpeg' }
          )
          if (error) throw error
          uploadedPaths.push({ path, isPrimary: img.isPrimary })
        }
        const payload = uploadedPaths.map(p => ({ card_id: card.id, storage_path: p.path, is_primary: p.isPrimary }))
        const { error: imgErr } = await supabase.from('card_images').insert(payload)
        if (imgErr) throw imgErr
      }

    // iOS: avoid lingering focus (which causes auto-zoom) before we navigate
    (document.activeElement as HTMLElement | null)?.blur?.();

      alert('Saved!')
      router.push('/')
    } catch (e: any) {
      alert(`Save failed: ${e.message ?? e}`)
    }
  }

  const titlePreview = useMemo(() => {
    return `${year || '—'} ${ (brandChoice && brandChoice !== '__OTHER_BRAND__') ? brandChoice : (customBrand || '—') } #${cardNo || '—'}`
  }, [year, brandChoice, customBrand, cardNo])

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold">Add Card</h1>
        <Link href="/" className="text-sm text-gray-600">Back</Link>
      </div>

      {/* Player */}
      <label className="text-sm font-medium">Player</label>
      <select className="border rounded px-2 py-1 w-full" value={playerChoice} onChange={(e) => setPlayerChoice(e.target.value)}>
        {players.map(p => (<option key={p.id} value={p.id}>{p.full_name}</option>))}
        <option value="__OTHER__">Other…</option>
      </select>
      {showNewPlayer && (
        <input className="border rounded px-2 py-1 w-full" placeholder="New player name" value={newPlayer} onChange={(e) => setNewPlayer(e.target.value)} />
      )}

      {/* Sport */}
      <label className="text-sm font-medium">Sport</label>
      <select className="border rounded px-2 py-1 w-full" value={sportChoice} onChange={(e) => setSportChoice(e.target.value)}>
        {sports.map(s => <option key={s} value={s}>{s}</option>)}
        <option value="__OTHER_SPORT__">Other…</option>
      </select>
      {showNewSport && (
        <div className="flex gap-2">
          <input className="border rounded px-2 py-1 flex-1" placeholder="Custom sport" value={customSport} onChange={(e) => setCustomSport(e.target.value)} />
          <button className="border rounded px-3" onClick={addSport}>Add</button>
        </div>
      )}

      {/* Brand */}
      <label className="text-sm font-medium">Brand</label>
      <select className="border rounded px-2 py-1 w-full" value={brandChoice} onChange={(e) => setBrandChoice(e.target.value)}>
        {brands.map(b => <option key={b} value={b}>{b}</option>)}
        <option value="__OTHER_BRAND__">Other…</option>
      </select>
      {showNewBrand && (
        <div className="flex gap-2">
          <input className="border rounded px-2 py-1 flex-1" placeholder="Custom brand" value={customBrand} onChange={(e) => setCustomBrand(e.target.value)} />
          <button className="border rounded px-3" onClick={addBrand}>Add</button>
        </div>
      )}

      {/* Year / Card # */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Year</label>
          <input className="border rounded px-2 py-1 w-full" placeholder="1970" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Card #</label>
          <input className="border rounded px-2 py-1 w-full" placeholder="175" value={cardNo} onChange={(e) => setCardNo(e.target.value)} />
        </div>
      </div>

      {/* Graded toggle + preview */}
      <div className="flex items-center gap-3">
        <button className="border rounded px-3 py-1" onClick={() => setIsGraded(v => !v)}>
          {isGraded ? 'Graded: ON' : 'Graded: OFF'}
        </button>
        <div className="text-sm text-gray-500">{titlePreview}</div>
      </div>

      {isGraded && (
        <>
          <label className="text-sm font-medium">Grading Company</label>
          <select className="border rounded px-2 py-1 w-full" value={companyChoice} onChange={(e) => setCompanyChoice(e.target.value)}>
            <option value="">Select…</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="__OTHER_COMPANY__">Other…</option>
          </select>

          {showNewCompany && (
            <div className="flex gap-2">
              <input className="border rounded px-2 py-1 flex-1" placeholder="Custom company" value={customCompany} onChange={(e) => setCustomCompany(e.target.value)} />
              <button className="border rounded px-3" onClick={addCompany}>Add</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Certification #</label>
              <input className="border rounded px-2 py-1 w-full" value={gradingNo} onChange={(e) => setGradingNo(e.target.value)} placeholder="e.g. 106519951" />
            </div>
            <div>
              <label className="text-sm font-medium">Grade</label>
              <input className="border rounded px-2 py-1 w-full" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. 6.5" inputMode="decimal" />
            </div>
          </div>
        </>
      )}

      {/* Tags */}
      <div>
        <label className="text-sm font-medium">Tags</label>
        <TagInput
          value={tags}
          onChange={setTags}
          placeholder="Add a tag and press Enter (e.g., RC, Auto)"
          suggestions={['RC','Auto','Refractor','Numbered','Patch','HOF']}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm font-medium">Notes</label>
        <textarea
          className="border rounded px-2 py-1 w-full"
          rows={3}
          placeholder="Anything special about this card…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Images */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Photos</label>
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={onPickFiles} />
        <button className="rounded border px-3 py-1" onClick={openPicker}>
          {images.length ? 'Add More Photos' : 'Add Photo(s)'}
        </button>

        {images.length > 0 && (
          <div className="flex overflow-x-auto gap-3 py-2">
            {images.map((im, i) => (
              <div key={i} className="min-w-[140px]">
                <img src={im.url} alt="card" className="w-[140px] h-[140px] object-contain border rounded" />
                <div className="flex gap-2 mt-2">
                  {im.isPrimary ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border">Primary</span>
                  ) : (
                    <button className="text-xs px-2 py-1 rounded-full border" onClick={() => makePrimary(i)}>Make Primary</button>
                  )}
                  <button className="text-xs px-2 py-1 rounded-full border" onClick={() => removeImage(i)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {images.length > 0 && (
          <button className="text-xs underline" onClick={clearImages}>Clear all</button>
        )}
      </div>

      <div className="pt-2">
        <button className="rounded bg-indigo-600 text-white px-4 py-2" onClick={save}>Save</button>
      </div>

      {activeFile && (
        <CropperModal file={activeFile} aspect={2 / 3} onCancel={cancelCrop} onDone={handleCropped} />
      )}
    </div>
  )
}