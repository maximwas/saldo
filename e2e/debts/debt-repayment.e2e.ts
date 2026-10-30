import { expect, type Page } from '@playwright/test'
import { DEMO } from '../fixtures/demo-data.fixture'
import {
  accountBalanceMinor,
  ensureIncomeDate,
  monthExpenseMinor,
  monthIncomeMinor,
} from '../fixtures/overview.fixture'
import { test } from '../fixtures/roles.fixture'

const LENT_MINOR = 100_000
const REPAID_MINOR = 40_000

async function chooseAccount(page: Page, label: string) {
  await page.getByRole('dialog').getByLabel(label).click()
  await page.getByRole('option', { name: new RegExp(DEMO.cardName) }).click()
}

test('часткове повернення зменшує залишок боргу й змінює рахунок, але не доходи місяця', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const person = `e2e-${crypto.randomUUID().slice(0, 8)}`
  const row = page.getByRole('listitem').filter({ hasText: person })

  await ensureIncomeDate(page)

  const incomeBefore = await monthIncomeMinor(page)
  const expenseBefore = await monthExpenseMinor(page)
  const balanceBefore = await accountBalanceMinor(page, DEMO.cardName)

  await page.goto('/payments/debts')
  await page.getByRole('button', { name: 'Додати борг' }).click()

  const form = page.getByRole('dialog')

  await form.getByLabel('Людина').fill(person)
  await form.getByLabel('Сума боргу').fill('1000')
  await chooseAccount(page, 'З якого рахунку (або на який) рухаються гроші')
  await form.getByRole('button', { name: 'Зберегти' }).click()
  await expect(form).toBeHidden()
  await expect(row).toContainText('1 000,00')

  // lending moves money out of the account, and it is neither income nor an expense
  await page.goto('/')
  expect(await accountBalanceMinor(page, DEMO.cardName)).toBe(balanceBefore - LENT_MINOR)
  expect(await monthIncomeMinor(page)).toBe(incomeBefore)
  expect(await monthExpenseMinor(page)).toBe(expenseBefore)

  await page.goto('/payments/debts')
  await row.getByRole('button', { name: 'Повернення' }).click()

  const repay = page.getByRole('dialog')

  await repay.getByLabel('Сума повернення').fill('400')
  await chooseAccount(page, 'Рахунок')
  await repay.getByRole('button', { name: 'Повернути' }).click()
  await expect(repay).toBeHidden()
  await expect(row).toContainText('600,00')
  await expect(row).toContainText('Частково')

  await page.goto('/')
  expect(await accountBalanceMinor(page, DEMO.cardName)).toBe(balanceBefore - LENT_MINOR + REPAID_MINOR)
  expect(await monthIncomeMinor(page)).toBe(incomeBefore)
  expect(await monthExpenseMinor(page)).toBe(expenseBefore)
})

test('глядач бачить борги без кнопок запису', async ({ pageAs }) => {
  const page = await pageAs('viewer')

  await page.goto('/payments/debts')
  await expect(page.getByRole('heading', { name: 'Мені винні' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Додати борг' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Повернення' })).toHaveCount(0)
})
