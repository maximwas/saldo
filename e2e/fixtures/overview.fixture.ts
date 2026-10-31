import { expect, type Locator, type Page } from '@playwright/test'

// "−1 234,56 ₴" -> -123456; the grouping space may be a no-break one
function minorOf(text: string): number {
  const match = text.match(/(−|-)?\s*(\d[\d\s  ]*)(?:,(\d{2}))?/)

  if (!match) {
    throw new Error(`e2e: no amount in "${text}"`)
  }

  const minor = Number(match[2].replace(/\D/g, '')) * 100 + Number(match[3] ?? 0)

  return match[1] ? -minor : minor
}

const nextValue = (term: Locator) => term.locator('xpath=following-sibling::*[1]')

// the Overview tiles are <dt>/<dd> pairs: the total of the hero and the expenses of the month card
export async function availableMinor(page: Page) {
  const term = page.getByText('= Доступно', { exact: true })

  await expect(term).toBeVisible()

  // biome-ignore lint/performance/useDomNodeTextContent: Playwright Locator.innerText, its line breaks split the tile and row text
  return minorOf(await nextValue(term).innerText())
}

async function monthTileMinor(page: Page, label: string) {
  const term = page.getByText(label, { exact: true })

  await expect(term).toBeVisible()

  // biome-ignore lint/performance/useDomNodeTextContent: Playwright Locator.innerText, its line breaks split the tile and row text
  return Math.abs(minorOf(await nextValue(term).innerText()))
}

export const monthExpenseMinor = (page: Page) => monthTileMinor(page, 'Витрати')

export const monthIncomeMinor = (page: Page) => monthTileMinor(page, 'Доходи')

export async function accountBalanceMinor(page: Page, name: string) {
  // only the Accounts card: the Upcoming card lists subscriptions as «… · <account name>» above it
  const card = page.locator('section').filter({
    has: page.getByRole('heading', {
      name: 'Рахунки',
      exact: true,
    }),
  })
  const row = card.getByRole('listitem').filter({ hasText: name })

  await expect(row).toBeVisible()

  // biome-ignore lint/performance/useDomNodeTextContent: Playwright Locator.innerText, its line breaks split the tile and row text
  const text = await row.innerText()

  // the balance is the last amount of the row; the kind line before it has no amount with a comma
  return minorOf(text.slice(text.search(/[−-]?\d[\d\s  ]*,\d{2}/)))
}

// the available figure is not shown until the owner sets the date of the next income (a space setting)
export async function ensureIncomeDate(page: Page) {
  await page.goto('/')

  const set = page.getByRole('button', { name: 'Вказати дату' })

  // the hero renders after the data arrives: wait for either state before choosing
  await expect(set.or(page.getByText('= Доступно', { exact: true }))).toBeVisible()

  if (!(await set.isVisible())) {
    return
  }

  await set.click()

  const sheet = page.getByRole('dialog')

  await sheet.getByLabel('Наступний дохід').click()
  await page.getByRole('button', { name: 'Наступний місяць' }).click()
  await page.getByRole('gridcell').filter({ hasText: /^15$/ }).getByRole('button').click()
  await sheet.getByRole('button', { name: 'Зберегти' }).click()
  await expect(page.getByText('= Доступно', { exact: true })).toBeVisible()
}
