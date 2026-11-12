import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache'

// Prerendered pages are served from the build's static assets; nothing in Saldo revalidates at runtime
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
})
