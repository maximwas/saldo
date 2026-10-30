import type { MetadataRoute } from 'next'

// colours mirror theme.css tokens (a manifest takes plain values): background = --color-app, theme = --color-card;
// icons are logo A2 (Figma Brand/Mark 10:71281), generated from public/favicon.svg by `pnpm icons`
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Saldo',
    short_name: 'Saldo',
    description: 'Особисті фінанси',
    lang: 'uk',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f5f7',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/pwa-64x64.png',
        sizes: '64x64',
        type: 'image/png',
      },
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
