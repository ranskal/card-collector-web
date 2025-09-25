'use client'
import { supabase } from './supabase'

export function publicUrl(path: string) {
  return supabase.storage.from('card-images').getPublicUrl(path).data.publicUrl
}

export async function uploadBlob(userId: string, tmp: string, blob: Blob, mime = 'image/jpeg') {
  const ext = mime.split('/')[1] || 'jpg'
  const path = `${userId}/${tmp}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase
    .storage
    .from('card-images')
    .upload(path, blob, { contentType: mime, upsert: false })
  if (error) throw error
  return path
}