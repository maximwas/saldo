import { expect } from '@playwright/test'
import { test } from '../fixtures/roles.fixture'
import { addSubscription, kyivToday } from '../fixtures/subscriptions.fixture'

test('фільтр календаря в URL переживає перезавантаження й змінює денні суми', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await addSubscription(page, mark, '75')

  // the search keeps the day to this test's own subscription: other tests plan payments on the same day
  await page.goto(`/calendar?q=${mark}`)

  const day = page.locator(`[data-day="${kyivToday()}"]`)
  const expenses = page.getByRole('button', {
    name: 'Фактичні витрати',
    exact: true,
  })

  await expect(day).toContainText('План')
  await expect(day).toContainText('−75,00')

  await expenses.click()
  await expect(page).toHaveURL(/kinds=expense/)
  await expect(day).not.toContainText('75,00')

  await page.reload()
  await expect(expenses).toHaveAttribute('aria-pressed', 'true')
  await expect(page).toHaveURL(new RegExp(`q=${mark}`))
  // the grid renders only once the filtered day totals have loaded
  await expect(day).toBeVisible()
  await expect(day).not.toContainText('75,00')

  await page
    .getByRole('button', {
      name: 'Усе',
      exact: true,
    })
    .click()
  await expect(day).toContainText('−75,00')
})
