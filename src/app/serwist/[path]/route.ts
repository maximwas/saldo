import { createSerwistRoute } from '@serwist/turbopack'

// the worker is built by esbuild on request and served from /serwist/sw.js (Serwist's Turbopack route)
const serwistRoute = createSerwistRoute({
  swSrc: 'src/app/sw.ts',
  useNativeEsbuild: true,
})

// cacheComponents rejects the segment config Serwist also returns (dynamic, revalidate, dynamicParams)
export const { generateStaticParams, GET } = serwistRoute
