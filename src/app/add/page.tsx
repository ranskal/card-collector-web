'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ensureUser } from '@/lib/auth'
import { publicUrl, uploadBlob } from '@/lib/storage'
import Cropper from 'react-easy-crop'

type PlayerRow = { id: string; full_name: string }
type LocalImg = { file: File; blobUrl: string; isPrimary: boolean }

export default function AddCard() {
  const router = useRouter()
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [playerId, setPlayerId] = useState('')
  const [newPlayer, setNewPlayer] = useState('')

  const [sport, setSport] = useState('Baseball')
  const [brand, setBrand] = useState('Topps')
  const [year, setYear] = useState('')
  const [cardNo, setCardNo] = useState('')

  const [isGraded, setIsGraded] = useState(false)
  const [company, setCompany] = useState('')
  const [cert, setCert] = useState('')
  const [grade, setGrade] = useState('')

  const [images, setImages] = useState<LocalImg[]>([])        // preview list
  const [cropOpen, setCropOpen] = useState(false)              // crop modal
  const [cropFile, setCropFile] = useState<File | null>(null)  // file being cropped
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<any>(null)

  useEffect(() => {
    (async () => {
      const user = await ensureUser()
      const { data } = await supabase
        .from('players').select('id, full_name')
        .eq('owner_id', user.id).order('full_name')
      if (data) setPlayers(data)
    })()
  }, [])

  // Add images (multi) – choose & open crop for each if desired
  async function pickImages(evt: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(evt.target.files || [])
    if (!files.length) return
    // open crop UI for the first one; queue the rest after crop or just add raw
    setCropFile(files[0])
    setCropOpen(true)
    // store the rest to handle later if you want to crop each; for simplicity we crop only first here.
    // Or push all as raw:
    if (files.length > 1) {
      const rest = files.slice(1).map((f, idx) => ({
        file: f,
        blobUrl: URL.createObjectURL(f),
        isPrimary: images.length === 0 && idx === 0 ? true : false
      }))
      setImages(prev => [...prev, ...rest])
    }
    evt.target.value = '' // reset
  }

  // EasyCrop helpers
  function onCropComplete(_: any, areaPixels: any) {
    setCroppedArea(areaPixels)
  }

  async function cropToBlob(file: File, area: any): Promise<Blob> {
    const img = await createImage(URL.createObjectURL(file))
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const { x, y, width, height } = area
    canvas.width = width
    canvas.height = height
    ctx.drawImage(img, x, y, width, height, 0, 0, width, height)
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), file.type, 0.95))
  }

  function createImage(src: string): Promise<HTMLImageElement> {
    return new Promise((res, rej) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = rej
      img.src = src
    })
  }

  async function applyCrop() {
    if (!cropFile || !croppedArea) { setCropOpen(false); return }
    const blob = await cropToBlob(cropFile, croppedArea)
    const file = new File([blob], cropFile.name, { type: cropFile.type })
    const blobUrl = URL.createObjectURL(file)
    setImages(prev => {
      const isPrimary = prev.length === 0
      return [...prev, { file, blobUrl, isPrimary }]
    })
    setCropOpen(false)
    setCropFile(null)
  }

  function makePrimary(idx: number) {
    setImages(prev => prev.map((it, i) => ({ ...it, isPrimary: i === idx })))
  }
  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  async function submit() {
    try {
      const user = await ensureUser()

      // resolve player id (existing or new)
      let pid = playerId
      if (!pid) {
        const name = newPlayer.trim()
        if (!name) return alert('Pick a player or enter a name')
        const { data: inserted, error } = await supabase
          .from('players')
          .insert({ full_name: name, owner_id: user.id })
          .select().single()
        if (error || !inserted) throw error ?? new Error('Insert player failed')
        pid = inserted.id
      }

      const { data: card, error: cErr } = await supabase
        .from('cards')
        .insert({
          owner_id: user.id,
          player_id: pid,
          sport, brand,
          year: year ? Number(year) : null,
          card_no: cardNo || null,
          is_graded: isGraded,
          grading_company: isGraded ? (company || null) : null,
          grading_no: isGraded ? (cert || null) : null,
          grade: isGraded && grade ? Number(grade) : null
        }).select().single()
      if (cErr) throw cErr

      // upload each image to Supabase Storage
      for (const [idx, it] of images.entries()) {
        const path = await uploadBlob(user.id, String(card.id), it.file, it.file.type)
        await supabase.from('card_images').insert({
          owner_id: user.id,
          card_id: card.id,
          storage_path: path,
          is_primary: it.isPrimary || idx === 0
        })
      }

      alert('Saved')
      router.push('/')
    } catch (e: any) {
      alert(e.message ?? String(e))
    }
  }

  return (
    <div className="space-y-4">
      {/* player */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold">Player</label>
        <select
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 bg-white"
        >
          <option value="">— Add New —</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
        {!playerId && (
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Type new player name"
            value={newPlayer}
            onChange={(e) => setNewPlayer(e.target.value)}
          />
        )}
      </div>

      {/* basics */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold">Sport</label>
          <input className="w-full rounded-lg border px-3 py-2" value={sport} onChange={e=>setSport(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-semibold">Brand</label>
          <input className="w-full rounded-lg border px-3 py-2" value={brand} onChange={e=>setBrand(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-semibold">Year</label>
          <input inputMode="numeric" className="w-full rounded-lg border px-3 py-2" value={year} onChange={e=>setYear(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-semibold">Card #</label>
          <input className="w-full rounded-lg border px-3 py-2" value={cardNo} onChange={e=>setCardNo(e.target.value)} />
        </div>
      </div>

      {/* grading */}
      <div className="flex items-center gap-3">
        <input id="graded" type="checkbox" checked={isGraded} onChange={e=>setIsGraded(e.target.checked)} />
        <label htmlFor="graded">Graded</label>
      </div>
      {isGraded && (
        <div className="grid grid-cols-3 gap-3">
          <input placeholder="Company" className="rounded-lg border px-3 py-2" value={company} onChange={e=>setCompany(e.target.value)} />
          <input placeholder="Cert #" className="rounded-lg border px-3 py-2" value={cert} onChange={e=>setCert(e.target.value)} />
          <input placeholder="Grade" className="rounded-lg border px-3 py-2" value={grade} onChange={e=>setGrade(e.target.value)} />
        </div>
      )}

      {/* images */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold">Images</label>
        <input type="file" accept="image/*" multiple capture="environment" onChange={pickImages} />
        {images.length > 0 && (
          <div className="flex gap-3 overflow-x-auto py-2">
            {images.map((it, i) => (
              <div key={i} className="text-center">
                <div className="w-28 h-28 border rounded-lg overflow-hidden">
                  <img src={it.blobUrl} className="w-full h-full object-cover" />
                </div>
                <div className="mt-1 flex gap-2 justify-center text-xs">
                  {it.isPrimary
                    ? <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Primary</span>
                    : <button className="px-2 py-0.5 rounded-full border" onClick={()=>makePrimary(i)}>Make Primary</button>}
                  <button className="px-2 py-0.5 rounded-full border" onClick={()=>removeImage(i)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="rounded-xl bg-indigo-600 px-4 py-2 text-white font-semibold" onClick={submit}>
        Save
      </button>

      {/* Crop modal */}
      {cropOpen && cropFile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="w-[90vw] h-[70vh] bg-white rounded-xl p-3 flex flex-col">
            <div className="relative flex-1">
              <Cropper
                image={URL.createObjectURL(cropFile)}
                crop={crop}
                zoom={zoom}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                aspect={undefined} // free form
                objectFit="contain"
              />
            </div>
            <div className="flex gap-3 pt-3">
              <button className="flex-1 rounded-lg border py-2" onClick={()=>{setCropOpen(false); setCropFile(null)}}>Cancel</button>
              <button className="flex-1 rounded-lg bg-indigo-600 text-white py-2" onClick={applyCrop}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}