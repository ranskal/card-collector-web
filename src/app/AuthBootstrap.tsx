'use client'
import { useEffect } from 'react'
import { ensureUser } from '@/lib/auth'

export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
  useEffect(() => { ensureUser().catch(console.warn) }, [])
  return <>{children}</>
}