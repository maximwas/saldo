import type { SaldoClient } from '@/types/supabase.types'

const AVATARS_BUCKET = 'avatars'

/** the storage policies of migration avatars accept exactly this name, whatever the image type */
const avatarPath = (userId: string) => `${userId}.webp`

/** the new photo over the old one, then the reference: its time is the version in the photo's URL */
export async function saveAvatar(supabase: SaldoClient, userId: string, image: Blob) {
  const path = avatarPath(userId)
  const upload = await supabase.storage.from(AVATARS_BUCKET).upload(path, image, {
    upsert: true,
    contentType: image.type,
  })

  if (upload.error) {
    throw upload.error
  }

  const { error } = await supabase
    .from('user_settings')
    .update({
      avatar_path: path,
      avatar_updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}

/** the reference first: nobody asks for a file without it, so a failed removal only leaves an unused object */
export async function removeAvatar(supabase: SaldoClient, userId: string) {
  const { error } = await supabase
    .from('user_settings')
    .update({
      avatar_path: null,
      avatar_updated_at: null,
    })
    .eq('user_id', userId)

  if (error) {
    throw error
  }

  await supabase.storage.from(AVATARS_BUCKET).remove([avatarPath(userId)])
}
