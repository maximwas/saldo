import { createSerwistRoute } from '@serwist/turbopack'

// the worker is built by esbuild on request and served from /serwist/sw.js (Serwist's Turbopack route)
// the shell's static files come from the build manifest; the offline page is precached too, re-fetched on every deploy
const serwistRoute = createSerwistRoute({
  swSrc: 'src/app/sw.ts',
  useNativeEsbuild: true,
  additionalPrecacheEntries: [
    {
      url: '/~offline',
      revision: process.env.VERCEL_GIT_COMMIT_SHA ?? crypto.randomUUID(),
    },
  ],
})

// cacheComponents rejects the segment config Serwist also returns (dynamic, revalidate, dynamicParams)
export const { generateStaticParams, GET } = serwistRoute
