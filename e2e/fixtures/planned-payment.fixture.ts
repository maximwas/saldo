import { expect, type Page } from '@playwright/test'

/** a manual planned payment through «Upcoming» on a day of the current month (the date picker opens on it) */
export async function addPlannedPayment(page: Page, name: string, amount: string, day: number) {
  await page.goto('/payments')
  await page.getByRole('button', { name: /^Додати (плановий )?платіж$/ }).click()

  const form = page.getByRole('dialog')

  await form.getByLabel('Назва').fill(name)
  await form.getByLabel('Сума').fill(amount)
  await form.getByLabel('Дата платежу').click()
  await page
    .getByRole('gridcell')
    .filter({ hasText: new RegExp(`^${day}$`) })
    .getByRole('button')
    .click()
  // the date picker is a dialog too: save once only the sheet is left
  await expect(form).toHaveCount(1)
  await form.getByRole('button', { name: 'Зберегти' }).click()
  await expect(form).toBeHidden()
}

/** «03.11» of a YYYY-MM-DD, as the calendar writes a day */
export const shortDay = (day: string) => `${day.slice(8)}.${day.slice(5, 7)}`
