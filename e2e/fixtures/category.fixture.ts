import type { Locator, Page } from '@playwright/test'

/** an expense needs a category (Figma new-operation error frames 5:93500 / 5:101464); every e2e space has the standard groceries one */
export async function pickCategory(page: Page, dialog: Locator, name = 'Продукти') {
  await dialog.getByLabel('Категорія').click()
  await page
    .getByRole('option', {
      name,
      exact: true,
    })
    .click()
}
