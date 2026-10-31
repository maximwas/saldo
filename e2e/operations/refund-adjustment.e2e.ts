import { expect } from '@playwright/test'
import { DEMO } from '../fixtures/demo-data.fixture'
import {
  accountBalanceMinor,
  ensureIncomeDate,
  monthExpenseMinor,
  monthIncomeMinor,
} from '../fixtures/overview.fixture'
import { test } from '../fixtures/roles.fixture'

const PURCHASE_MINOR = 52_000
const REFUND_MINOR = 26_000

// 12345 -> "123,45": the way a person types an amount into MoneyInput
const typed = (minor: number) => `${Math.trunc(minor / 100)},${String(minor % 100).padStart(2, '0')}`

test('повернення зменшує витрати місяця, а не додає доходу; коригування ставить залишок без впливу на місяць', async ({
  pageAs,
}) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await ensureIncomeDate(page)

  const expenseBefore = await monthExpenseMinor(page)
  const incomeBefore = await monthIncomeMinor(page)

  await page.goto('/operations?add=expense')

  const sheet = page.getByRole('dialog')

  await sheet.getByLabel('Сума').fill(typed(PURCHASE_MINOR))
  await sheet.getByLabel('Одержувач').fill(mark)
  await sheet.getByRole('button', { name: 'Зберегти' }).click()
  await expect(sheet).toBeHidden()

  await page.getByRole('button', { name: mark }).click()
  await sheet.getByRole('button', { name: 'Записати повернення' }).click()
  // the amount starts at the whole purchase and cannot go above what is left of it
  await expect(sheet.getByLabel('Сума')).toHaveValue(typed(PURCHASE_MINOR))
  await sheet.getByLabel('Сума').fill(typed(PURCHASE_MINOR + 100))
  await sheet.getByRole('button', { name: 'Записати повернення' }).click()
  await expect(sheet.getByText('Більше, ніж можна повернути')).toBeVisible()
  await sheet.getByLabel('Сума').fill(typed(REFUND_MINOR))
  await sheet.getByRole('button', { name: 'Записати повернення' }).click()
  await expect(sheet).toBeHidden()

  await page.goto('/')
  expect(await monthExpenseMinor(page)).toBe(expenseBefore + PURCHASE_MINOR - REFUND_MINOR)
  expect(await monthIncomeMinor(page)).toBe(incomeBefore)

  const cashBefore = await accountBalanceMinor(page, DEMO.cashName)
  const actual = cashBefore + 12_345

  await page.goto('/operations/accounts')
  await page
    .getByRole('listitem')
    .filter({ hasText: DEMO.cashName })
    .getByRole('button', { name: 'Дії з рахунком' })
    .click()
  await page.getByRole('menuitem', { name: 'Коригувати залишок' }).click()

  const adjust = page.getByRole('dialog')

  await adjust.getByLabel('Фактичний залишок').fill(typed(actual))
  await adjust.getByRole('button', { name: 'Записати коригування' }).click()
  await expect(adjust.getByText('Додайте примітку: без неї коригування не записати')).toBeVisible()
  await adjust.getByLabel('Примітка').fill(`${mark} знайшлася готівка`)
  await adjust.getByRole('button', { name: 'Записати коригування' }).click()
  await expect(adjust).toBeHidden()

  await page.goto('/')
  expect(await accountBalanceMinor(page, DEMO.cashName)).toBe(actual)
  // an adjustment is neither income nor spending (§5)
  expect(await monthExpenseMinor(page)).toBe(expenseBefore + PURCHASE_MINOR - REFUND_MINOR)
  expect(await monthIncomeMinor(page)).toBe(incomeBefore)
})
