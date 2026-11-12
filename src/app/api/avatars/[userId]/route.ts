import { z } from 'zod'
import { getServerSupabase } from '@/lib/supabase/server-client'

// A person's photo for the people who share a space with them (and for themselves), through the caller's own
// session: the storage RLS of migration avatars decides, so a stranger, a signed-out request and a missing photo all
// get 404. A stable URL instead of a signed one: ?v=<upload time> changes with every new photo, so the browser may
// keep each version (a fresh signed URL on every refetch would reload the image and flash the letter).
export async function GET(_request: Request, { params }: RouteContext<'/api/avatars/[userId]'>) {
  const { userId } = await params

  if (!z.uuid().safeParse(userId).success) {
    return new Response(null, { status: 404 })
  }

  const supabase = await getServerSupabase()
  const { data, error } = await supabase.storage.from('avatars').download(`${userId}.webp`)

  if (error) {
    return new Response(null, { status: 404 })
  }

  return new Response(data, {
    headers: {
      'content-type': data.type || 'image/webp',
      'cache-control': 'private, max-age=604800, immutable',
    },
  })
}
