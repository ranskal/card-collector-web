'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ensureUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'

type Player = { id: string; full_name: string }

const DEFAULT_SPORTS = ['Baseball', 'Basketball', 'Football', 'Hockey', 'Miscellaneous'] as const
const DEFAULT_BRANDS = ['Topps', 'Fleer', 'Donruss', 'Philadelphia'] as const
const DEFAULT_COMPANIES = ['PSA', 'SGC', 'BVG', 'Beckett', 'SWG', 'CGC'] as const

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

  // images (in-browser files + previews)
  type LocalImg = { file: File; url: string; isPrimary: boolean }
  const [images, setImages] = useState<LocalImg[]>([])

  // load players
  useEffect(() => {
    (async () => {
      try {
        const u = await ensureUser()
        console.log('[add] user id:', u.id)
        const { data, error } = await supabase
          .from('players')
          .select('id, full_name')
          .order('full_name', { ascending: true })
        if (error) throw error
        setPlayers(data ?? [])
        if (data && data.length) setPlayerChoice(data[0].id)
      } catch (e) {
        console.error(e)
      }
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

  // image file input
  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setImages(prev => [
      ...prev,
      ...files.map((f, i) => ({
        file: f,
        url: URL.createObjectURL(f),
        isPrimary: prev.length === 0 && i === 0 ? true : false,
      })),
    ])
    e.target.value = '' // allow re-selecting same file later
  }

  function makePrimary(i: number) {
    setImages(prev => prev.map((img, idx) => ({ ...img, isPrimary: idx === i })))
  }
  function removeImage(i: number) {
    setImages(prev => prev.filter((_, idx) => idx !== i))
  }
  function clearImages() {
    setImages([])
  }

  async function save() {
    try {
      const u = await ensureUser()

      // resolve player id
      let playerId = playerChoice
      if (!playerId || playerId === '__OTHER__') {
        const name = newPlayer.trim()
        if (!name) {
          alert('Please enter a player name.')
          return
        }
        // upsert-ish
        const { data: existing } = await supabase
          .from('players')
          .select('id')
          .eq('full_name', name)
          .maybeSingle()

        if (existing) {
          playerId = existing.id
        } else {
          const { data: inserted, error } = await supabase
            .from('players')
            .insert({ full_name: name })
            .select()
            .single()
          if (error || !inserted) throw error ?? new Error('Failed to insert player')
          playerId = inserted.id
          setPlayers(prev => [...prev, { id: inserted.id, full_name: name }].sort((a,b)=>a.full_name.localeCompare(b.full_name)))
        }
      }

      if (!year.trim() || isNaN(+year)) {
        alert('Year must be a number.')
        return
      }

      // resolve graded company if needed
      let gradingCompany: string | null = null
      if (isGraded) {
        if (!companyChoice) {
          alert('Select a grading company or choose Other…')
          return
        }
        gradingCompany = companyChoice === '__OTHER_COMPANY__' ? (customCompany.trim() || null) : companyChoice
        if (!gradingCompany) {
          alert('Enter a grading company.')
          return
        }
      }

      // create card
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
        })
        .select()
        .single()
      if (cErr || !card) throw cErr ?? new Error('Failed to insert card')

      // upload files to storage + insert card_images rows
      if (images.length) {
        const tmp = String(Date.now())
        const uploadedPaths: { path: string; isPrimary: boolean }[] = []

        for (let i = 0; i < images.length; i++) {
          const img = images[i]
          const ext = img.file.name.split('.').pop()?.toLowerCase() || 'jpg'
          const path = `${u.id}/${tmp}/${Date.now()}-${i}.${ext}`
          const { error } = await supabase.storage
            .from('card-images')
            .upload(path, img.file, { upsert: false })
          if (error) throw error
          uploadedPaths.push({ path, isPrimary: img.isPrimary })
        }

        const payload = uploadedPaths.map(p => ({
          card_id: card.id,
          storage_path: p.path,
          is_primary: p.isPrimary,
        }))
        const { error: imgErr } = await supabase.from('card_images').insert(payload)
        if (imgErr) throw imgErr
      }

      alert('Saved!')
      router.push('/')
    } catch (e: any) {
      alert(`Save failed: ${e.message ?? e}`)
    }
  }

  // small helpers
  const titlePreview = useMemo(() => {
    return `${year || '—'} ${showNewBrand ? customBrand : brandChoice || '—'} #${cardNo || '—'}`
  }, [year, brandChoice, customBrand, showNewBrand, cardNo])

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold">Add Card</h1>
        <Link href="/" className="text-sm text-gray-600">Back</Link>
      </div>

      {/* Player */}
      <label className="text-sm font-medium">Player</label>
      <select
        className="border rounded px-2 py-1 w-full"
        value={playerChoice}
        onChange={(e) => setPlayerChoice(e.target.value)}
      >
        {players.map(p => (
          <option key={p.id} value={p.id}>{p.full_name}</option>
        ))}
        <option value="__OTHER__">Other…</option>
      </select>
      {showNewPlayer && (
        <input
          className="border rounded px-2 py-1 w-full"
          placeholder="New player name"
          value={newPlayer}
          onChange={(e) => setNewPlayer(e.target.value)}
        />
      )}

      {/* Sport */}
      <label className="text-sm font-medium">Sport</label>
      <select
        className="border rounded px-2 py-1 w-full"
        value={sportChoice}
        onChange={(e) => setSportChoice(e.target.value)}
      >
        {sports.map(s => <option key={s} value={s}>{s}</option>)}
        <option value="__OTHER_SPORT__">Other…</option>
      </select>
      {showNewSport && (
        <div className="flex gap-2">
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="Custom sport"
            value={customSport}
            onChange={(e) => setCustomSport(e.target.value)}
          />
          <button className="border rounded px-3" onClick={addSport}>Add</button>
        </div>
      )}

      {/* Brand */}
      <label className="text-sm font-medium">Brand</label>
      <select
        className="border rounded px-2 py-1 w-full"
        value={brandChoice}
        onChange={(e) => setBrandChoice(e.target.value)}
      >
        {brands.map(b => <option key={b} value={b}>{b}</option>)}
        <option value="__OTHER_BRAND__">Other…</option>
      </select>
      {showNewBrand && (
        <div className="flex gap-2">
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="Custom brand"
            value={customBrand}
            onChange={(e) => setCustomBrand(e.target.value)}
          />
          <button className="border rounded px-3" onClick={addBrand}>Add</button>
        </div>
      )}

      {/* Year / Card # */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Year</label>
          <input
            className="border rounded px-2 py-1 w-full"
            placeholder="1970"
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Card #</label>
          <input
            className="border rounded px-2 py-1 w-full"
            placeholder="175"
            value={cardNo}
            onChange={(e) => setCardNo(e.target.value)}
          />
        </div>
      </div>

      {/* Graded toggle + fields */}
      <div className="flex items-center gap-3">
        <button
          className="border rounded px-3 py-1"
          onClick={() => setIsGraded(v => !v)}
        >
          {isGraded ? 'Graded: ON' : 'Graded: OFF'}
        </button>
        <div className="text-sm text-gray-500">{titlePreview}</div>
      </div>

      {isGraded && (
        <>
          <label className="text-sm font-medium">Grading Company</label>
          <select
            className="border rounded px-2 py-1 w-full"
            value={companyChoice}
            onChange={(e) => setCompanyChoice(e.target.value)}
          >
            <option value="">Select…</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="__OTHER_COMPANY__">Other…</option>
          </select>

          {showNewCompany && (
            <div className="flex gap-2">
              <input
                className="border rounded px-2 py-1 flex-1"
                placeholder="Custom company"
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
              />
              <button className="border rounded px-3" onClick={addCompany}>Add</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Certification #</label>
              <input
                className="border rounded px-2 py-1 w-full"
                value={gradingNo}
                onChange={(e) => setGradingNo(e.target.value)}
                placeholder="e.g. 106519951"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Grade</label>
              <input
                className="border rounded px-2 py-1 w-full"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g. 6.5"
                inputMode="decimal"
              />
            </div>
          </div>
        </>
      )}

      {/* Images */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Photos</label>
        <input type="file" accept="image/*" multiple onChange={onPickFiles} />
        {images.length > 0 && (
          <div className="flex overflow-x-auto gap-3 py-2">
            {images.map((im, i) => (
              <div key={i} className="min-w-[140px]">
                <img
                  src={im.url}
                  alt="card"
                  className="w-[140px] h-[140px] object-contain border rounded"
                />
                <div className="flex gap-2 mt-2">
                  {im.isPrimary ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border">
                      Primary
                    </span>
                  ) : (
                    <button
                      className="text-xs px-2 py-1 rounded-full border"
                      onClick={() => makePrimary(i)}
                    >
                      Make Primary
                    </button>
                  )}
                  <button
                    className="text-xs px-2 py-1 rounded-full border"
                    onClick={() => removeImage(i)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {images.length > 0 && (
          <button className="text-xs underline" onClick={clearImages}>
            Clear all
          </button>
        )}
      </div>

      <div className="pt-2">
        <button
          className="rounded bg-indigo-600 text-white px-4 py-2"
          onClick={save}
        >
          Save
        </button>
      </div>
    </div>
  )
}