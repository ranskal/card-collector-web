// src/components/CropperModal.tsx
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

  // allow zooming smaller than "fit" (1.0)
  const MIN_ZOOM = 0.35
  const MAX_ZOOM = 5

  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(0.9) // start slightly smaller than full fit
  const [area, setArea] = useState<Area | null>(null)

  function onCropComplete(_: Area, croppedAreaPixels: Area) {
    setArea(croppedAreaPixels)
  }

  async function handleUsePhoto() {
    if (!area) return
    const blob = await cropToBlob(url, area)
    await onDone(blob)
  }

  function handleFit() {
    // center the image and reset zoom to a "fit" view
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
      <div className="w-full max-w-[520px] rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="relative h-[60vh] bg-black">
          <Cropper
            image={url}
            crop={crop}
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid={false}
            objectFit="contain"
            restrictPosition={false}
          />
        </div>

        <div className="flex items-center gap-3 p-4">
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
            aria-label="Zoom"
          />
          <span className="text-xs text-slate-600 w-10 text-right">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleFit}
            className="rounded border px-3 py-1 text-gray-700"
            title="Fit to view"
          >
            Fit
          </button>
          <button
            onClick={onCancel}
            className="rounded border px-3 py-1 text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleUsePhoto}
            className="rounded bg-indigo-600 text-white px-4 py-1.5"
          >
            Use Photo
          </button>
        </div>
      </div>
    </div>
  )
}

/** Crop the given image URL to the pixel area and return a JPEG Blob */
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