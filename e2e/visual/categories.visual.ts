import { expect, test } from '@playwright/test'
import { matchFrame, signInAsDemo } from './match-frame.fixture'

// Figma «Saldo», page 1:104, section 2:49638 (categories): the list and the delete dialog
test.describe('categories desktop', () => {
  test.use({
    viewport: {
      width: 1440,
      height: 900,
    },
  })

  test('categories desktop 2:49639', async ({ page }) => {
    await signInAsDemo(page)
    await page.goto('/operations/categories')
    await matchFrame(page, {
      frameId: '2:49639',
      width: 1440,
      height: 1326,
    })
  })

  test('delete dialog desktop 2:52713', async ({ page }) => {
    await signInAsDemo(page)
    await page.goto('/operations/categories')
    await page.getByRole('listitem').filter({ hasText: 'Кафе' }).getByRole('button').last().click()
    await page.getByRole('menuitem', { name: 'Видалити' }).click()
    await expect(page.getByRole('dialog').getByText('Категорію використано')).toBeVisible()
    await matchFrame(page, {
      frameId: '2:52713',
      width: 1440,
      height: 900,
    })
  })
})

test.describe('categories mobile', () => {
  test.use({
    viewport: {
      width: 390,
      height: 844,
    },
  })

  test('categories mobile 2:50386', async ({ page }) => {
    await signInAsDemo(page)
    await page.goto('/operations/categories')
    await matchFrame(page, {
      frameId: '2:50386',
      width: 390,
      height: 1469,
    })
  })
})
