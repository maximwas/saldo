import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'

const PUBLIC_PATHS = ['/login', '/invite']

// Refreshes the Supabase session cookies and sends signed-out visitors to /login?next=…; the real boundary is RLS
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // getClaims right after createServerClient: it refreshes an expired token and writes the new cookies
  const { data } = await supabase.auth.getClaims()
  const { pathname, search } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))

  if (!data?.claims && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', pathname + search)
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  // /api/* and /.well-known/* have their own auth (cron secret, OAuth for MCP): a redirect would break their clients
  matcher: [
    '/((?!api/|\\.well-known/|_next/static|_next/image|favicon.ico|manifest.webmanifest|serwist/|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)',
  ],
}
