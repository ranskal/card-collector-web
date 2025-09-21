import { supabase } from './supabase'

export async function ensureUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return user
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  if (!data.user) throw new Error('Anonymous sign-in failed')
  return data.user
}