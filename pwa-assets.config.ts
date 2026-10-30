import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// `pnpm icons` writes favicon.ico and the PWA, maskable and Apple PNGs next to public/favicon.svg.
// Maskable and Apple icons sit on full-bleed --color-primary: Android crops maskable icons, iOS paints transparency black.
const primary = '#2b66f6'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: {
        background: primary,
      },
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: {
        background: primary,
      },
    },
  },
  images: ['public/favicon.svg'],
})
