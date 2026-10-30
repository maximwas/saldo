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
  '/more',
]

for (const path of MENU_PATHS) {
  test(`${path} opens without horizontal scroll @mobile`, async ({ pageAs }) => {
    const page = await pageAs('owner')
    const response = await page.goto(path)

    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )

    expect(overflows).toBe(false)
  })
}
