import { expect, test } from '@playwright/test'
import { matchFrame, signInAsDemo } from './match-frame.fixture'

// Figma «Saldo», page 1:104, section 2:21072 (accounts): the list and the «delete → archive» dialog
const DESKTOP = {
  width: 1440,
  height: 900,
}

test.describe('accounts desktop', () => {
  test.use({ viewport: DESKTOP })

  test('accounts desktop 2:21073', async ({ page }) => {
    await signInAsDemo(page)
    await page.goto('/operations/accounts')
    await matchFrame(page, {
      frameId: '2:21073',
      ...DESKTOP,
    })
  })

  test('archive dialog desktop 5:106214', async ({ page }) => {
    await signInAsDemo(page)
    await page.goto('/operations/accounts')
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Валютний EUR' })
      .getByRole('button', { name: 'Дії з рахунком' })
      .click()
    await page.getByRole('menuitem', { name: 'Видалити' }).click()
    await expect(page.getByRole('dialog').getByText('На рахунку')).toBeVisible()
    await matchFrame(page, {
      frameId: '5:106214',
      ...DESKTOP,
    })
  })
})

test.describe('accounts mobile', () => {
  test.use({
    viewport: {
      width: 390,
      height: 844,
    },
  })

  test('accounts mobile 2:21278', async ({ page }) => {
    await signInAsDemo(page)
    await page.goto('/operations/accounts')
    await matchFrame(page, {
      frameId: '2:21278',
      width: 390,
      height: 982,
    })
  })

  test('archive sheet mobile 5:106467', async ({ page }) => {
    await signInAsDemo(page)
    await page.goto('/operations/accounts')
    await page.getByRole('button', { name: 'Валютний EUR: Дії з рахунком' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Видалити' }).click()
    await expect(page.getByRole('dialog').getByText('На рахунку')).toBeVisible()
    await matchFrame(page, {
      frameId: '5:106467',
      width: 390,
      height: 844,
    })
  })
})
