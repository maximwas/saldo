import { expect } from '@playwright/test'
import { test } from '../fixtures/roles.fixture'

// every menu item of spec §2 (Sidebar, TabBar, the More page); kept as data so the test does not depend on UI constants
const MENU_PATHS = [
  '/',
  '/operations',
  '/operations/accounts',
  '/operations/categories',
  '/payments',
  '/payments/subscriptions',
  '/payments/credits',
  '/payments/debts',
  '/calendar',
  '/budget',
  '/budget/goals',
  '/budget/big-expenses',
  '/auto',
  '/auto/fuel',
  '/auto/service',
  '/auto/plan',
  '/taxes',
  '/taxes/liabilities',
  '/taxes/payments',
  '/taxes/settings',
  '/statistics',
  '/settings',
  '/space',
]

for (const path of MENU_PATHS) {
  test(`${path} opens without horizontal scroll @mobile`, async ({ pageAs }) => {
    const page = await pageAs('owner')
    const response = await page.goto(path)

    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // measured with the data on screen: the statistics tables were wider than a phone only once loaded
    await page.waitForLoadState('networkidle')

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )

    expect(overflows).toBe(false)
  })
}

test('a section that is not built yet says «soon», what it will hold and leads back', async ({ pageAs }) => {
  const page = await pageAs('owner')

  await page.goto('/budget/goals')
  await expect(page.getByRole('heading', { name: '«Цілі та конверти» — скоро' })).toBeVisible()
  await page.getByRole('button', { name: 'До розділу «Бюджет»' }).click()
  await expect(page).toHaveURL('/budget')
})

// screens with data and the shell around them: React error #418 came from the device cache, restored before a streamed
// screen hydrated (the server never has that cache), so every one renders the server's state until hydration ends
const HYDRATED_PATHS = [
  '/',
  '/operations',
  '/operations/accounts',
  '/operations/categories',
  '/payments',
  '/payments/subscriptions',
  '/payments/credits',
  '/payments/debts',
  '/calendar',
  '/budget',
  '/statistics',
  '/notifications',
  '/settings',
  '/settings/general',
  '/settings/notifications',
  '/settings/currencies',
  '/settings/security',
  '/space',
]

for (const path of HYDRATED_PATHS) {
  test(`${path} hydrates over the device cache without a mismatch @mobile`, async ({ pageAs }) => {
    const page = await pageAs('owner')
    const mismatches: string[] = []

    page.on('pageerror', (error) => {
      if (/hydrat|#418/i.test(error.message)) {
        mismatches.push(error.message)
      }
    })
    page.on('console', (message) => {
      if (message.type() === 'error' && /hydrat|#418/i.test(message.text())) {
        mismatches.push(message.text())
      }
    })
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    // the device cache is written with a 250 ms throttle: the reload must find it
    await page.waitForTimeout(500)
    await page.reload()
    await page.waitForLoadState('networkidle')

    expect(mismatches).toEqual([])
  })
}
