'use client'

import { use } from 'react'
import ClientDetails from './ClientDetails'

type Props = {
  params: Promise<{ id: string }> | { id: string }
}

export default function Page({ params }: Props) {
  // Next 15 may provide params as a Promise (sync dynamic APIs)
  const { id } = typeof (params as any)?.then === 'function' ? use(params as Promise<{ id: string }>) : (params as { id: string })

  return <ClientDetails id={id} />
}