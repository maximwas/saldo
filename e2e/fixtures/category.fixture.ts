import type { Locator, Page } from '@playwright/test'

/** an expense and an income need a category (Figma 5:93500 / 5:101464 / 2:17848); every e2e space has the standard
 * groceries and salary ones */
export async function pickCategory(page: Page, dialog: Locator, name = 'Продукти') {
  await dialog.getByLabel('Категорія').click()
  await page
    .getByRole('option', {
      name,
      exact: true,
    })
    .click()
}
