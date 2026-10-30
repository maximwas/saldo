import { withSerwist } from '@serwist/turbopack'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
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
