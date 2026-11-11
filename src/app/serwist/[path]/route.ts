import { createSerwistRoute } from '@serwist/turbopack'
import { cacheLife } from 'next/cache'

// the worker is built by esbuild and served from /serwist/sw.js (Serwist's Turbopack route)
// the shell's static files come from the build manifest; the offline page is precached too, re-fetched on every deploy
const serwistRoute = createSerwistRoute({
  swSrc: 'src/app/sw.ts',
  useNativeEsbuild: true,
  additionalPrecacheEntries: [
    {
      url: '/~offline',
      revision: process.env.WORKERS_CI_COMMIT_SHA ?? crypto.randomUUID(),
    },
  ],
})

// esbuild cannot run in the Cloudflare Worker: `use cache` lets the build prerender the files, and the Worker serves
// them as static output until the next deploy (the build runs esbuild's file reads, which would make the route dynamic)
async function buildServiceWorkerFile(path: string) {
  'use cache'
  cacheLife('max')

  const response = await serwistRoute.GET(new Request('http://localhost'), {
    params: Promise.resolve({ path }),
  })

  return {
    body: await response.text(),
    headers: Object.fromEntries(response.headers),
  }
}

// cacheComponents rejects the segment config Serwist also returns (dynamic, revalidate, dynamicParams)
export const { generateStaticParams } = serwistRoute

export async function GET(_request: Request, { params }: RouteContext<'/serwist/[path]'>) {
  const { path } = await params
  const file = await buildServiceWorkerFile(path)

  return new Response(file.body, {
    headers: file.headers,
  })
}
