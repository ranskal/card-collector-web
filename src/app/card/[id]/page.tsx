// src/app/card/[id]/page.tsx
'use client'

import { Suspense } from 'react'
import ClientDetails from './ClientDetails'

export default function Page({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-500">Loading…</div>}>
      <ClientDetails id={params.id} />
    </Suspense>
  )
}