'use client'
import { useState } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { cropToBlob } from '@/lib/crop'

type Props = {
  open: boolean
  image: string | null   // data URL to crop
  aspect?: number        // e.g. 2.5/3.5 for cards
  onClose: () => void
  onConfirm: (blob: Blob) => void
}

export default function CropperModal({ open, image, aspect = 2.5/3.5, onClose, onConfirm }: Props) {
  const [zoom, setZoom] = useState(1)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [area, setArea] = useState<Area | null>(null)

  if (!open || !image) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
      <div className="w-[min(92vw,520px)] rounded-xl bg-white p-4 shadow-xl">
        <div className="relative h-[60vh] rounded-lg overflow-hidden bg-black/5">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, a) => setArea(a)}
            cropShape="rect"
            showGrid={false}
            objectFit="contain"
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <input
            type="range"
            min={1} max={4} step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border px-4 py-2"
          >Cancel</button>

          <button
            onClick={async () => {
              if (!area) return
              const blob = await cropToBlob(image, area)
              onConfirm(blob)
              onClose()
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-white"
          >Use Crop</button>
        </div>
      </div>
    </div>
  )
}