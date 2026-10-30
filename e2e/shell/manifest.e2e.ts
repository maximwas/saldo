import { expect, test } from '@playwright/test'

test('the web app manifest is served', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest')

  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject({
 name: 'Saldo',
short_name: 'Saldo' 
})
})
