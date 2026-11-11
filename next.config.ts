import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
import { withSerwist } from '@serwist/turbopack'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  // left to the Cloudflare bundler, which picks the package's workerd build: its JSON Schema validator (Ajv) compiles
  // with new Function, which workerd forbids, and the workerd build swaps it for @cfworker/json-schema
  serverExternalPackages: ['@modelcontextprotocol/server'],
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

// next-intl without i18n routing: no /uk or /en prefix, the locale comes from src/i18n/request.ts
const withNextIntl = createNextIntlPlugin()

export default withSerwist(withNextIntl(nextConfig))

// `next dev` gets the Worker bindings from wrangler.jsonc, as in production
initOpenNextCloudflareForDev()
