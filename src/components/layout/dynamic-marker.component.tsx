import { connection } from 'next/server'
import { Suspense } from 'react'

async function Connection() {
  await connection()

  return null
}

// The root generateMetadata reads the user's locale (a Supabase query), so a page whose own content is a static shell
// must say it renders per request: this empty marker does, inside <Suspense>, so the shell still prerenders
// (Next.js «blocking-prerender-metadata-dynamic»; a marker in a layout does not count)
export function DynamicMarker() {
  return (
    <Suspense>
      <Connection />
    </Suspense>
  )
}
