import { expect, type Page } from '@playwright/test'
import { pickCategory } from '../fixtures/category.fixture'
import { DEMO } from '../fixtures/demo-data.fixture'
import { minorOf } from '../fixtures/overview.fixture'
import { test } from '../fixtures/roles.fixture'

const EXPENSE_MINOR = 12_550
const INCOME_MINOR = 30_000

async function tile(page: Page, label: string) {
  const value = page.locator('dl:visible').getByText(label, { exact: true }).locator('xpath=following-sibling::dd')
  // a month without operations shows the empty state instead of the tiles: its figures are zero
  const empty = page.getByRole('heading', { name: /даних немає/ })

  await expect(value.or(empty)).toBeVisible()

  if (await empty.isVisible()) {
    return 0
  }

  // biome-ignore lint/performance/useDomNodeTextContent: Playwright Locator.innerText, rendered text is what the user sees
  return minorOf(await value.innerText())
}

async function tableTotal(page: Page, name: string, column: number) {
  const cell = page.getByRole('table', { name }).locator('tfoot td').nth(column)

  await expect(cell).toBeVisible()

  // biome-ignore lint/performance/useDomNodeTextContent: Playwright Locator.innerText, rendered text is what the user sees
  return minorOf(await cell.innerText())
}

test('перекази й позика не потрапляють у доходи та витрати, таблиця під діаграмою збігається з підсумком', async ({
  pageAs,
}) => {
  const page = await pageAs('owner')
  const person = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await page.goto('/statistics')

  const incomeBefore = await tile(page, 'Доходи')
  const expenseBefore = await tile(page, 'Витрати')

  // a real expense and income, so the month has figures to compare
  for (const [kind, amount] of [
    ['expense', '125,50'],
    ['income', '300'],
  ]) {
    await page.goto(`/operations?add=${kind}`)

    const sheet = page.getByRole('dialog')

    await sheet.getByLabel('Сума').fill(amount)

    if (kind === 'expense') {
      await sheet.getByLabel('Одержувач').fill(person)
    }

    // an income needs a category too (Figma 2:17848)
    await pickCategory(page, sheet, kind === 'expense' ? 'Продукти' : 'Зарплата')

    await sheet.getByRole('button', { name: 'Зберегти' }).click()
    await expect(sheet).toBeHidden()
  }

  // a transfer between own accounts
  await page.goto('/operations?add=transfer')

  const transfer = page.getByRole('dialog')

  await transfer.getByLabel('Списано').fill('500')
  await transfer.getByRole('button', { name: 'Зберегти переказ' }).click()
  await expect(transfer).toBeHidden()

  // a loan: money leaves the card, nothing is spent
  await page.goto('/payments/debts')
  await page.getByRole('button', { name: 'Додати борг' }).click()

  const debt = page.getByRole('dialog')

  await debt.getByLabel('Людина').fill(person)
  await debt.getByLabel('Сума боргу').fill('1000')
  await debt.getByLabel('З якого рахунку (або на який) рухаються гроші').click()
  await page.getByRole('option', { name: new RegExp(DEMO.cardName) }).click()
  await debt.getByRole('button', { name: 'Зберегти' }).click()
  await expect(debt).toBeHidden()

  const income = incomeBefore + INCOME_MINOR
  const expense = expenseBefore + EXPENSE_MINOR

  await page.goto('/statistics?view=table')
  // the device cache paints the figures of the first visit (an empty month) until the refetch brings the new ones
  await expect.poll(() => tile(page, 'Доходи')).toBe(income)
  await expect.poll(() => tile(page, 'Витрати')).toBe(expense)

  // the tables carry the same totals as the tiles: the categories table and the income / expenses table
  expect(await tableTotal(page, 'Витрати за категоріями', 2)).toBe(expense)
  expect(await tableTotal(page, 'Доходи проти витрат', 1)).toBe(income)
  expect(await tableTotal(page, 'Доходи проти витрат', 2)).toBe(expense)
})

// Figma 41:109930: the first load failed and nothing is cached, so the screen is one ErrorState under the filters
test('перше завантаження не вдалося: картка «Не вдалося завантажити статистику», «Спробувати ще» її прибирає', async ({
  pageAs,
}) => {
  const page = await pageAs('owner')
  const cashflow = '**/rest/v1/rpc/stats_cashflow'

  await page.route(cashflow, (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: '{"message":"e2e"}',
    }),
  )
  await page.goto('/statistics')

  // TanStack Query retries three times before the error shows
  await expect(page.getByRole('alert').getByText('Не вдалося завантажити статистику')).toBeVisible({ timeout: 20_000 })

  await page.unroute(cashflow)
  await page.getByRole('button', { name: 'Спробувати ще' }).click()

  await expect(page.getByText('Не вдалося завантажити статистику')).toHaveCount(0)
})
