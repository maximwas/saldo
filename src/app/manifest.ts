import type { MetadataRoute } from 'next'

// colours mirror theme.css tokens (a manifest takes plain values): background = --color-app, theme = --color-card;
// icons are the Sidebar brand mark «Mark» 2:11335, exported from Figma as SVG and rasterised to PNG
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
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
