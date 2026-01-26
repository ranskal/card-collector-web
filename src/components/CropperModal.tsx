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

  // 1) Crop size in pixels (from react-easy-crop)
  const cropW = Math.round(area.width)
  const cropH = Math.round(area.height)

  // 2) Resize rule (longest edge cap)
  const MAX_EDGE = 2000
  const longest = Math.max(cropW, cropH)
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1

  const outW = Math.round(cropW * scale)
  const outH = Math.round(cropH * scale)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get 2D canvas context')

  canvas.width = outW
  canvas.height = outH

  // Better downscaling quality
  ctx.imageSmoothingEnabled = true
  // @ts-expect-error: some browsers don't type this, but support it
  ctx.imageSmoothingQuality = 'high'

  // 3) Draw cropped region into resized output canvas
  ctx.drawImage(
    img,
    Math.round(area.x),
    Math.round(area.y),
    cropW,
    cropH,
    0,
    0,
    outW,
    outH
  )

  // 4) Export JPEG with tighter quality
  const JPEG_QUALITY = 0.78

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
      'image/jpeg',
      JPEG_QUALITY
    )
  })

  return blob
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    // Helps consistency for blob/object URLs and some browser decode paths
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}