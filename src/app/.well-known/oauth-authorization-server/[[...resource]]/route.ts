import { metadataCorsOptionsRequestHandler } from 'mcp-handler'
import { connection } from 'next/server'
import { env } from '@/lib/env'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

// Supabase Auth's own RFC 8414 metadata, unchanged (issuer and endpoints stay Supabase's): Perplexity and clients of the
// 2025-03 MCP spec look for it on the MCP server's origin instead of following the protected resource metadata
export async function GET() {
  // read per request (the CDN caches it), never baked in at build time when OAuth may still be off
  await connection()

  const upstream = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/.well-known/oauth-authorization-server/auth/v1`)

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...CORS,
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      // the CDN keeps a good answer for an hour; an error (OAuth server off) is not cached
      'Cache-Control': upstream.ok ? 'public, max-age=3600, s-maxage=3600' : 'no-store',
    },
  })
}

export const OPTIONS = metadataCorsOptionsRequestHandler()
