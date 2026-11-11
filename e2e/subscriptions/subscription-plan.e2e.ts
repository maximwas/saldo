import { expect } from '@playwright/test'
import { test } from '../fixtures/roles.fixture'
import { addSubscription, kyivToday } from '../fixtures/subscriptions.fixture'

test('нова щомісячна підписка з’являється в «Найближчих» і в календарі на свою дату', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await addSubscription(page, mark, '120')

  await page.goto('/payments')

  const today = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Сьогодні' }) })
  const row = today.getByRole('listitem').filter({ hasText: mark })

  await expect(row).toHaveCount(1)
  await expect(row).toContainText('Підписка')
  await expect(row).toContainText('120,00')
  // Upcoming opens only the months within 30 days; the rest of the plan waits behind «Show the next month»
  await expect(page.getByRole('button', { name: 'Показати наступний місяць' })).toBeVisible()

  // the calendar shows the same plan on today's cell, its sum among the day's plan totals
  await page.goto(`/calendar?q=${mark}`)

  const day = page.locator(`[data-day="${kyivToday()}"]`)

  await expect(day).toContainText(mark)
  await expect(day).toContainText('−120,00')

  // the series is planned 13 months ahead, one obligation per month: the card's History lists them all as planned
  await page.goto('/payments/subscriptions')
  await page.getByRole('button', { name: new RegExp(mark) }).click()
  await page.getByRole('tab', { name: 'Історія' }).click()

  const ahead = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Наступні оплати за планом' }) })

  await expect(ahead.getByRole('listitem')).toHaveCount(14)
})

test('зміна ціни з майбутньою датою не змінює вже оплачений платіж', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await addSubscription(page, mark, '100')

  await page.goto('/payments')
  await page.getByRole('listitem').filter({ hasText: mark }).first().getByRole('button', { name: 'Оплатити' }).click()

  const pay = page.getByRole('dialog')

  await pay.getByRole('button', { name: 'Оплачено' }).click()
  await expect(pay).toBeHidden()

  await page.goto('/payments/subscriptions')
  await page.getByRole('button', { name: new RegExp(mark) }).click()
  await page.getByRole('button', { name: 'Змінити ціну' }).click()

  const price = page.getByRole('dialog')

  // «Effective from» defaults to the next open payment, a month ahead
  await price.getByLabel('Нова сума за раз').fill('150')
  await price.getByRole('button', { name: 'Зберегти' }).click()
  await expect(price).toBeHidden()

  await page.getByRole('tab', { name: 'Історія' }).click()

  const payments = page.getByRole('tabpanel').getByRole('listitem')
  const paid = payments.filter({ hasText: 'Оплачено' })

  await expect(paid).toHaveCount(1)
  await expect(paid).toContainText('100,00')
  // the paid one sits under «Past payments», apart from the plan ahead
  const past = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Минулі оплати' }) })

  await expect(past.getByRole('listitem')).toHaveCount(1)
  await expect(past).toContainText('Оплачено')
  await expect(payments.filter({ hasText: 'План' }).first()).toContainText('150,00')
  await expect(payments.filter({ hasText: 'План' }).filter({ hasText: '100,00' })).toHaveCount(0)

  // a half-typed setting survives a look at another tab: an opened panel stays under <Activity>
  const note = page.getByRole('tabpanel').getByLabel('Примітка')

  await page.getByRole('tab', { name: 'Налаштування' }).click()
  await note.fill(`${mark} draft`)
  await page.getByRole('tab', { name: 'Історія' }).click()
  await expect(note).toBeHidden()
  await page.getByRole('tab', { name: 'Налаштування' }).click()
  await expect(note).toHaveValue(`${mark} draft`)
})

test('позначка «Під питанням» каже, що змінилось, і веде до свого фільтра', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await addSubscription(page, mark, '50')

  const row = page.getByRole('listitem').filter({ hasText: mark })

  await row.getByRole('button', { name: 'Під питанням' }).click()
  await expect(row.getByRole('button', { name: 'Під питанням' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(`${mark}: позначено «Під питанням»`, { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Показати' }).click()
  await expect(page).toHaveURL(/state=review/)
  await expect(page.getByRole('listitem').filter({ hasText: mark })).toHaveCount(1)
})
