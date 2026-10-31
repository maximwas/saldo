import { expect } from '@playwright/test'
import { pickCategory } from '../fixtures/category.fixture'
import { DEMO } from '../fixtures/demo-data.fixture'
import { accountBalanceMinor, availableMinor, ensureIncomeDate, monthExpenseMinor } from '../fixtures/overview.fixture'
import { test } from '../fixtures/roles.fixture'

const EXPENSE_MINOR = 12_550

test('витрата змінює залишок і «Доступно» рівно один раз, подвійний клік «Зберегти» — один рядок', async ({
  pageAs,
}) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await ensureIncomeDate(page)

  const balanceBefore = await accountBalanceMinor(page, DEMO.cardName)
  const availableBefore = await availableMinor(page)
  const expenseBefore = await monthExpenseMinor(page)

  await page.goto('/operations?add=expense')

  const sheet = page.getByRole('dialog')

  await sheet.getByLabel('Сума').fill('125,50')
  await sheet.getByLabel('Одержувач').fill(mark)
  await pickCategory(page, sheet)
  await sheet.getByRole('button', { name: 'Зберегти' }).dblclick()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('row', { name: new RegExp(mark) })).toHaveCount(1)

  await page.goto('/')
  expect(await accountBalanceMinor(page, DEMO.cardName)).toBe(balanceBefore - EXPENSE_MINOR)
  expect(await availableMinor(page)).toBe(availableBefore - EXPENSE_MINOR)
  expect(await monthExpenseMinor(page)).toBe(expenseBefore + EXPENSE_MINOR)

  // a reload must not change anything: the operation was counted once on the server, not once per render
  await page.reload()
  expect(await availableMinor(page)).toBe(availableBefore - EXPENSE_MINOR)
})

test('переказ між рахунками не додає витрат місяця @mobile', async ({ pageAs }) => {
  const page = await pageAs('owner')

  await ensureIncomeDate(page)

  const expenseBefore = await monthExpenseMinor(page)
  const cardBefore = await accountBalanceMinor(page, DEMO.cardName)
  const cashBefore = await accountBalanceMinor(page, DEMO.cashName)

  await page.goto('/operations?add=transfer')

  const sheet = page.getByRole('dialog')

  await sheet.getByLabel('Списано').fill('500')
  await sheet.getByRole('button', { name: 'Зберегти переказ' }).click()
  await expect(sheet).toBeHidden()

  await page.goto('/')
  expect(await monthExpenseMinor(page)).toBe(expenseBefore)
  // from the first account to the second one by default
  expect(await accountBalanceMinor(page, DEMO.cardName)).toBe(cardBefore - 50_000)
  expect(await accountBalanceMinor(page, DEMO.cashName)).toBe(cashBefore + 50_000)
})
