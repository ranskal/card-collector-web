// src/app/page.tsx
import { Suspense } from 'react'
import HomeClient from './HomeClient'

export default function Page() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-500">Loading…</div>}>
      <HomeClient />
    </Suspense>
  )
}