'use client'

import { useEffect, useMemo, useState } from 'react'
import Cropper, { Area } from 'react-easy-crop'

type Props = {
  file: File
  aspect?: number
  onCancel: () => void
  onDone: (blob: Blob) => void | Promise<void>
}

export default function CropperModal({
  file,
  aspect = 2 / 3,
  onCancel,
  onDone,
}: Props) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])

  const [crop, setCrop] = useState({ x: 0, y: 0 })
  // Start slightly zoomed out, and allow down to 0.35
  const [zoom, setZoom] = useState(0.9)
  const [area, setArea] = useState<Area | null>(null)

  function onCropComplete(_: Area, croppedAreaPixels: Area) {
    setArea(croppedAreaPixels)
  }

  async function handleUsePhoto() {
    if (!area) return
    const blob = await cropToBlob(url, area)
    await onDone(blob)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
      <div className="w-full max-w-[520px] rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="relative h-[60vh] bg-black">
          <Cropper
            image={url}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid={false}
            objectFit="contain"
            restrictPosition={false}
            minZoom={0.35}
            maxZoom={4}
          />
        </div>

        <div className="flex items-center gap-4 p-4">
          <input
            type="range"
            min={0.35}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
            aria-label="Zoom"
          />
          <button onClick={onCancel} className="rounded border px-3 py-1 text-gray-700">
            Cancel
          </button>
          <button onClick={handleUsePhoto} className="rounded bg-indigo-600 text-white px-4 py-1.5">
            Use Photo
          </button>
        </div>
      </div>
    </div>
  )
}

async function cropToBlob(imageUrl: string, area: Area): Promise<Blob> {
  const img = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const { width, height, x, y } = area
  canvas.width = Math.round(width)
  canvas.height = Math.round(height)

  ctx.drawImage(
    img,
    Math.round(x),
    Math.round(y),
    Math.round(width),
    Math.round(height),
    0,
    0,
    Math.round(width),
    Math.round(height)
  )

  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', 0.92)
  )
  return blob
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}