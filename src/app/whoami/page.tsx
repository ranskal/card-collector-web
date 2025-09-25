'use client'
import { useEffect, useState } from 'react'
import { ensureUser } from '@/lib/auth'

export default function WhoAmI() {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    (async () => {
      const u = await ensureUser()
      setId(u.id)
      console.log('Supabase user id:', u.id)
    })()
  }, [])
  return <div className="p-4 text-sm">User id: <code>{id ?? 'loading…'}</code></div>
}