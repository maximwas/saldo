import { expect } from '@playwright/test'
import { seedRates } from '../fixtures/rates.fixture'
import { test } from '../fixtures/roles.fixture'

test('на телефоні смужка над героєм показує позначені курси й відкриває всі курси @mobile', async ({
  pageAs,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'the strip is the phone layout; desktop shows the «Курси» card')

  await seedRates()

  const page = await pageAs('owner')

  await page.goto('/')

  const strip = page.getByRole('button', { name: /курси на \d{2}\.\d{2}/ })

  await expect(strip).toContainText('$41,60')
  await expect(strip).toContainText('€41,50')
  await expect(strip).not.toContainText('zł')

  await strip.click()

  const sheet = page.getByRole('dialog', { name: 'Курси валют' })

  await sheet.getByRole('checkbox', { name: /Польський злотий/ }).click()
  await expect(sheet.getByText('В огляді · 3')).toBeVisible()
  // the phone sheet has no «Done» button: it closes with ✕ or a swipe
  await expect(sheet.getByRole('button', { name: 'Готово' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(strip).toContainText('zł9,65')
})
