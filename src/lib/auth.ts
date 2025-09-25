'use client'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

let inflight: Promise<User> | null = null

export async function ensureUser(): Promise<User> {
  if (inflight) return inflight
  inflight = (async () => {
    // 1) Try local session (fast, no request)
    const { data: s } = await supabase.auth.getSession()
    if (s.session?.user) return s.session.user

    // 2) Fallback: ask the server
    const { data: u } = await supabase.auth.getUser()
    if (u.user) return u.user

    // 3) Create an anonymous user
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    return data.user!
  })()
  try {
    return await inflight
  } finally {
    inflight = null
  }
}