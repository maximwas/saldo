import { expect, type Page } from '@playwright/test'
import { ensureIncomeDate, monthExpenseMinor } from '../fixtures/overview.fixture'
import { test } from '../fixtures/roles.fixture'

// the «left» detail of the credit card: «<open installments> · <amount>»
const leftOf = (page: Page) => page.locator('dt', { hasText: 'Залишилося' }).locator('xpath=following-sibling::dd[1]')

// 1 200 in 12 equal monthly installments from today, then its card; returns the card URL
async function addEqualCredit(page: Page, mark: string) {
  await page.goto('/payments/credits')
  await page.getByRole('button', { name: 'Додати кредит' }).click()

  const form = page.getByRole('dialog')

  await form.getByLabel('Назва покупки').fill(mark)
  await form.getByLabel('Вартість покупки').fill('1200')
  await form.getByLabel('Загальна сума до сплати').fill('1200')
  await form.getByLabel('Кількість внесків').fill('12')
  await form.getByRole('button', { name: 'Зберегти' }).click()
  await expect(form).toBeHidden()

  await page.getByRole('link', { name: mark }).click()
  await expect(page.getByRole('list', { name: 'Графік внесків' })).toBeVisible()

  return page.url()
}

// «Paid» on a credit opens the confirm sheet of Upcoming payments: confirm the suggested amount
async function confirmPayment(page: Page) {
  const pay = page.getByRole('dialog')

  await expect(page).toHaveURL(/\/payments\?pay=/)
  await pay.getByRole('button', { name: 'Оплачено' }).click()
  await expect(pay).toBeHidden()
}

test('кредит рівними внесками: графік із 12 внесків, «Оплачено» на першому зменшує залишок, повна вартість не у витратах', async ({
  pageAs,
}) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await ensureIncomeDate(page)

  const expenseBefore = await monthExpenseMinor(page)
  const card = await addEqualCredit(page, mark)

  await expect(page.getByRole('list', { name: 'Графік внесків' }).getByRole('listitem')).toHaveCount(12)
  await expect(leftOf(page)).toHaveText(/^12 · 1\s200,00\s₴$/)

  // the first installment is due today
  await page.getByRole('button', { name: 'Оплачено · внесок 1' }).click()
  await confirmPayment(page)

  await page.goto(card)
  await expect(leftOf(page)).toHaveText(/^11 · 1\s100,00\s₴$/)

  // the month's expenses grew by the paid installment only, not by the 1 200 purchase price
  await page.goto('/')
  expect(await monthExpenseMinor(page)).toBe(expenseBefore + 10_000)
})

test('дострокове погашення в день оплати внеску: неоплачені внески замінено одним на весь залишок, оплачений лишається', async ({
  pageAs,
}) => {
  const page = await pageAs('owner')
  const card = await addEqualCredit(page, `e2e-${crypto.randomUUID().slice(0, 8)}`)

  await page.getByRole('button', { name: 'Оплачено · внесок 1' }).click()
  await confirmPayment(page)
  await page.goto(card)

  await page.getByRole('button', { name: 'Дострокове погашення' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Підтвердити' }).click()
  await confirmPayment(page)

  await page.goto(card)
  await expect(leftOf(page)).toHaveText(/^0 · 0,00\s₴$/)
  await expect(page.getByText('Замінено новим графіком')).toHaveCount(11)
  await expect(
    page.getByRole('list', { name: 'Графік внесків' }).getByText('Оплачено', { exact: true }).filter({ visible: true }),
  ).toHaveCount(2)
})
