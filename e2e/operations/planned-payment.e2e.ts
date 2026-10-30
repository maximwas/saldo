import { expect } from '@playwright/test'
import { ensureIncomeDate, monthExpenseMinor } from '../fixtures/overview.fixture'
import { test } from '../fixtures/roles.fixture'

test('«Оплачено» створює одну операцію, видалення оплати повертає план у «Найближчі»', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`
  const upcoming = page.getByRole('listitem').filter({ hasText: mark })

  await ensureIncomeDate(page)

  const expenseBefore = await monthExpenseMinor(page)

  await page.goto('/payments')
  await page.getByRole('button', { name: 'Додати платіж' }).click()

  const form = page.getByRole('dialog')

  await form.getByLabel('Назва').fill(mark)
  await form.getByLabel('Сума').fill('350')
  await form.getByRole('button', { name: 'Зберегти' }).click()
  await expect(form).toBeHidden()

  await page.goto('/')
  await expect(upcoming).toHaveCount(1)

  await page.goto('/payments')
  await page.getByRole('listitem').filter({ hasText: mark }).getByRole('button', { name: 'Оплачено' }).click()

  const pay = page.getByRole('dialog')

  await pay.getByRole('button', { name: 'Оплачено' }).click()
  await expect(pay).toBeHidden()
  await expect(page.getByRole('listitem').filter({ hasText: mark })).toContainText('Оплачено')

  await page.goto('/')
  await expect(upcoming).toHaveCount(0)
  // the payment's operation has no payee to find it by: the month's expenses grew by it once
  expect(await monthExpenseMinor(page)).toBe(expenseBefore + 35_000)

  await page.goto('/payments')
  await page.getByRole('listitem').filter({ hasText: mark }).getByRole('button', { name: 'Скасувати оплату' }).click()

  const cancel = page.getByRole('dialog')

  await cancel.getByRole('button', { name: 'Скасувати оплату' }).click()
  await expect(cancel).toBeHidden()

  await page.goto('/')
  await expect(upcoming).toHaveCount(1)
  expect(await monthExpenseMinor(page)).toBe(expenseBefore)
})
