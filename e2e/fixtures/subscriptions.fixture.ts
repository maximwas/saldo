import { expect, type Page } from '@playwright/test'

/** a monthly subscription from today through the form; the owner's first account is preselected */
export async function addSubscription(page: Page, name: string, amount: string) {
  await page.goto('/payments/subscriptions')
  await page.getByRole('button', { name: 'Додати підписку' }).first().click()

  const form = page.getByRole('dialog')

  // a custom subscription: pick the custom subscription in the service picker, then type its name
  await form.getByRole('button', { name: 'Оберіть сервіс' }).click()
  await page.getByRole('option', { name: 'Власна підписка' }).click()
  await form.getByLabel('Назва').fill(name)
  await form.getByLabel('Сума за період').fill(amount)
  await form.getByRole('button', { name: 'Додати підписку' }).click()
  await expect(form).toBeHidden()
}

/** today as YYYY-MM-DD in the space's zone (the e2e browser runs in Europe/Kyiv too) */
export const kyivToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv' }).format(new Date())
