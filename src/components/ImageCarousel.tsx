'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export default function ImageCarousel({
  urls,
  initial = 0,
  alt = 'card',
}: { urls: string[]; initial?: number; alt?: string }) {
  const [idx, setIdx] = useState(Math.max(0, Math.min(initial, urls.length - 1)))
  const canPrev = idx > 0
  const canNext = idx < urls.length - 1

  // very simple swipe
  const startX = useRef<number | null>(null)
  function onTouchStart(e: React.TouchEvent) { startX.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    if (startX.current == null) return
    const dx = e.changedTouches[0].clientX - startX.current
    if (dx > 40 && canPrev) setIdx(i => i - 1)
    if (dx < -40 && canNext) setIdx(i => i + 1)
    startX.current = null
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && canPrev) setIdx(i => i - 1)
      if (e.key === 'ArrowRight' && canNext) setIdx(i => i + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canPrev, canNext])

  if (!urls.length) return null

  return (
    <div className="relative rounded-2xl overflow-hidden bg-white border" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="aspect-[3/2] w-full bg-slate-100 flex items-center justify-center">
        {/* use plain img to keep it simple */}
        <img src={urls[idx]} alt={alt} className="max-h-[380px] w-full object-contain" />
      </div>

      {/* Arrows */}
      {canPrev && (
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full px-3 py-2 shadow"
          onClick={() => setIdx(i => i - 1)}
          aria-label="Previous"
        >‹</button>
      )}
      {canNext && (
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full px-3 py-2 shadow"
          onClick={() => setIdx(i => i + 1)}
          aria-label="Next"
        >›</button>
      )}

      {/* Dots */}
      {urls.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-2 w-2 rounded-full ${i === idx ? 'bg-indigo-600' : 'bg-slate-300'}`}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}