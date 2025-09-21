import { supabase } from './supabase'

export function publicUrl(path: string) {
  return supabase.storage.from('card-images').getPublicUrl(path).data.publicUrl
}

export async function uploadBlob(userId: string, cardId: string, file: Blob, mime: string) {
  const ext = mime.split('/').pop() || 'jpg'
  const path = `${userId}/${cardId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('card-images').upload(path, file, {
    contentType: mime, upsert: false
  })
  if (error) throw error
  return path
}