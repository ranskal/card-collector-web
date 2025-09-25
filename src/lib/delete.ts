'use client'
import { supabase } from '@/lib/supabase'
import { ensureUser } from '@/lib/auth'

/**
 * Deletes a card and its images.
 * Order:
 *  1) fetch card_images paths
 *  2) delete storage objects in bucket
 *  3) delete card_images rows
 *  4) delete the card row
 *
 * RLS: this requires your current session to be allowed to delete these rows.
 * If the card was created by a different anonymous user (e.g. your phone),
 * the delete will fail unless you migrated owner_id or loosened policies.
 */
export async function deleteCardAndImages(cardId: string) {
  await ensureUser() // ensure there is a session (RLS)

  // 1) fetch image paths
  const { data: imgs, error: selErr } = await supabase
    .from('card_images')
    .select('storage_path')
    .eq('card_id', cardId)

  if (selErr) throw selErr

  // 2) delete storage objects
  if (imgs && imgs.length) {
    const paths = imgs.map(i => i.storage_path)
    const { error: storageErr } = await supabase
      .storage
      .from('card-images')
      .remove(paths)
    if (storageErr) throw storageErr
  }

  // 3) delete card_images rows
  const { error: delImgsErr } = await supabase
    .from('card_images')
    .delete()
    .eq('card_id', cardId)
  if (delImgsErr) throw delImgsErr

  // 4) delete card row
  const { error: delCardErr } = await supabase
    .from('cards')
    .delete()
    .eq('id', cardId)
  if (delCardErr) throw delCardErr
}