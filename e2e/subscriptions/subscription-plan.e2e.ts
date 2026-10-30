import { expect, type Page } from '@playwright/test'
import { test } from '../fixtures/roles.fixture'

/** a monthly subscription from today through the form; the owner's first account is preselected */
async function addSubscription(page: Page, name: string, amount: string) {
  await page.goto('/payments/subscriptions')
  await page.getByRole('button', { name: 'Додати підписку' }).first().click()

  const form = page.getByRole('dialog')

  await form.getByLabel('Назва').fill(name)
  await form.getByLabel('Сума за період').fill(amount)
  await form.getByRole('button', { name: 'Зберегти' }).click()
  await expect(form).toBeHidden()
}

test('нова щомісячна підписка з’являється в «Найближчих» на свою дату', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await addSubscription(page, mark, '120')

  await page.goto('/payments')

  const today = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Сьогодні' }) })
  const row = today.getByRole('listitem').filter({ hasText: mark })

  await expect(row).toHaveCount(1)
  await expect(row).toContainText('Підписка')
  await expect(row).toContainText('120,00')
  // the series is planned 13 months ahead, one obligation per month
  await expect(page.getByRole('listitem').filter({ hasText: mark })).toHaveCount(14)
})

test('зміна ціни з майбутньою датою не змінює вже оплачений платіж', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await addSubscription(page, mark, '100')

  await page.goto('/payments')
  await page.getByRole('listitem').filter({ hasText: mark }).first().getByRole('button', { name: 'Оплачено' }).click()

  const pay = page.getByRole('dialog')

  await pay.getByRole('button', { name: 'Оплачено' }).click()
  await expect(pay).toBeHidden()

  await page.goto('/payments/subscriptions')
  await page.getByRole('button', { name: new RegExp(mark) }).click()
  await page.getByRole('button', { name: 'Змінити ціну' }).click()

  const price = page.getByRole('dialog')

  // «Effective from» defaults to the next open payment, a month ahead
  await price.getByLabel('Нова ціна за період').fill('150')
  await price.getByRole('button', { name: 'Зберегти' }).click()
  await expect(price).toBeHidden()

  await page.getByRole('tab', { name: 'Історія' }).click()

  const payments = page.getByRole('tabpanel').getByRole('listitem')
  const paid = payments.filter({ hasText: 'Оплачено' })

  await expect(paid).toHaveCount(1)
  await expect(paid).toContainText('100,00')
  await expect(payments.filter({ hasText: 'План' }).first()).toContainText('150,00')
  await expect(payments.filter({ hasText: 'План' }).filter({ hasText: '100,00' })).toHaveCount(0)
})
