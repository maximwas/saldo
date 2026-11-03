import { expect, type Locator } from '@playwright/test'
import { ensureIncomeDate, monthExpenseMinor } from '../fixtures/overview.fixture'
import { test } from '../fixtures/roles.fixture'

// how far the icon's top is from the text's top; NaN (a failed check) when either is not on screen
async function topGap(icon: Locator, text: Locator) {
  const [iconBox, textBox] = await Promise.all([icon.boundingBox(), text.boundingBox()])

  return Math.abs((iconBox?.y ?? Number.NaN) - (textBox?.y ?? Number.NaN))
}

test('«Оплачено» створює одну операцію, видалення оплати повертає план у «Найближчі»', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`
  const upcoming = page.getByRole('listitem').filter({ hasText: mark })
  // with no open payments yet (a fresh database) the button is the empty state's longer «add a planned payment»
  const addPayment = page.getByRole('button', { name: /^Додати (плановий )?платіж$/ })

  await ensureIncomeDate(page)

  const expenseBefore = await monthExpenseMinor(page)

  await page.goto('/payments')
  await addPayment.click()

  const form = page.getByRole('dialog')

  await form.getByLabel('Назва').fill(mark)
  await form.getByLabel('Сума').fill('350')
  await form.getByRole('button', { name: 'Зберегти' }).click()
  await expect(form).toBeHidden()

  // the payments list holds every open plan; the Overview card shows only the first few by date, and other specs'
  // plans due today can push this one out of it
  await upcoming.getByRole('button', { name: 'Оплачено' }).click()

  const pay = page.getByRole('dialog')

  await pay.getByRole('button', { name: 'Оплачено' }).click()
  await expect(pay).toBeHidden()
  await expect(page.getByRole('listitem').filter({ hasText: mark })).toContainText('Оплачено')

  await page.goto('/')
  // the payment's operation has no payee to find it by: the month's expenses grew by it once (polled: the overview
  // shows the cached month first and refetches it)
  await expect.poll(() => monthExpenseMinor(page)).toBe(expenseBefore + 35_000)

  await page.goto('/payments')
  await page.getByRole('listitem').filter({ hasText: mark }).getByRole('button', { name: 'Скасувати оплату' }).click()

  const cancel = page.getByRole('dialog')

  await cancel.getByRole('button', { name: 'Скасувати оплату' }).click()
  await expect(cancel).toBeHidden()
  await expect(upcoming.getByRole('button', { name: 'Оплачено' })).toBeVisible()

  await page.goto('/')
  await expect.poll(() => monthExpenseMinor(page)).toBe(expenseBefore)

  // a plan whose date has passed without a payment waits in the overdue group (§7)
  await page.goto('/payments')
  await addPayment.click()

  const late = page.getByRole('dialog')

  await late.getByLabel('Назва').fill(`${mark}-late`)
  await late.getByLabel('Сума').fill('120')
  await late.getByLabel('Дата платежу').click()
  await page.getByRole('button', { name: 'Попередній місяць' }).click()
  await page.getByRole('gridcell').filter({ hasText: /^15$/ }).getByRole('button').click()
  // the calendar popover is a dialog too: save once only the sheet is left
  await expect(late).toHaveCount(1)
  await late.getByRole('button', { name: 'Зберегти' }).click()
  await expect(late).toBeHidden()
  await expect(
    page.locator('section').filter({ has: page.getByRole('heading', { name: 'Дата минула, оплату не підтверджено' }) }),
  ).toContainText(`${mark}-late`)

  // conventions §4.6c: an icon sits on the first text line, never on the centre of a text that runs 2+ lines (the
  // overdue banner wraps on a phone; the upcoming row always has a title and a status line)
  await page.setViewportSize({
    width: 390,
    height: 844,
  })
  await page.goto('/')

  const notice = page.getByText(/з минулою датою/)
  // the overdue plan sorts first in the capped Overview card; today's plan can be pushed out by other specs' plans
  const lateName = `${mark}-late`
  const row = page.getByRole('listitem').filter({ has: page.getByText(lateName, { exact: true }) })
  const title = row.getByText(lateName, { exact: true })

  await expect(notice).toBeVisible()
  await expect(title).toBeVisible()
  // more than one 24px line, or the check below proves nothing
  expect((await notice.boundingBox())?.height ?? 0).toBeGreaterThan(30)
  expect(await topGap(notice.locator('xpath=..').locator('svg').first(), notice)).toBeLessThanOrEqual(4)
  expect(await topGap(row.locator(':scope > *').first(), title)).toBeLessThanOrEqual(2)
})
