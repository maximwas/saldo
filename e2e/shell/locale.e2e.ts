import { test as base, expect } from '@playwright/test'
import { test } from '../fixtures/roles.fixture'

// the choice lands in user_settings.locale, so the test switches back to keep the owner in Ukrainian for other tests
test('owner switches the interface to English and back', async ({ pageAs }) => {
  const page = await pageAs('owner')

  await page.goto('/settings/general')
  await page.getByRole('button', { name: 'English' }).click()

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Settings',
    }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.reload()

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Settings',
    }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Українська' }).click()

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Налаштування',
    }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'uk')
})

base.describe('without a locale cookie', () => {
  base.use({ locale: 'en-US' })

  base('the login page follows Accept-Language', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })
})
