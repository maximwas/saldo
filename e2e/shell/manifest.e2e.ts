import { expect, test } from '@playwright/test'

type ManifestIcon = {
  src: string
  sizes: string
  type: string
  purpose?: string
}

test('the web app manifest is installable and its icons are public', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest')

  expect(response.status()).toBe(200)

  const manifest = await response.json()
  const icons: ManifestIcon[] = manifest.icons

  expect(manifest).toMatchObject({
    name: 'Saldo',
    short_name: 'Saldo',
    start_url: '/',
    display: 'standalone',
  })
  expect(icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
  expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true)

  for (const icon of icons) {
    const file = await request.get(icon.src)

    expect(file.status(), icon.src).toBe(200)
    expect(file.headers()['content-type'], icon.src).toBe(icon.type)

    // a PNG's IHDR chunk holds its width and height at bytes 16 and 20
    const png = await file.body()

    expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.src).toBe(icon.sizes)
  }
})

test('the favicon and the Apple touch icon are public', async ({ request }) => {
  const files = ['/favicon.ico', '/favicon.svg', '/apple-touch-icon-180x180.png']

  for (const name of files) {
    const file = await request.get(name)

    expect(file.status(), name).toBe(200)
  }
})

test('the manifest link sits in <head>, where Chrome looks for it to offer install', async ({ page }) => {
  await page.goto('/login')

  const parents = await page.locator('link[rel="manifest"]').evaluateAll((links) => {
    return links.map((link) => link.parentElement?.tagName)
  })

  expect(parents).toContain('HEAD')
})
