import { test } from '@playwright/test'
import { pickCategory } from '../fixtures/category.fixture'
import { matchFrame, signInAsDemo } from './match-frame.fixture'

// Figma «Saldo», page 1:104: section 2:16566 (new operation) and the operations edit frame with errors
const NEW_FRAMES = [
  {
    device: 'desktop',
    frameId: '2:16567',
    width: 1440,
    height: 900,
  },
  {
    device: 'mobile',
    frameId: '2:18677',
    width: 390,
    height: 930,
  },
]

for (const frame of NEW_FRAMES) {
  test.describe(frame.device, () => {
    test.use({
      viewport: {
        width: frame.width,
        height: frame.height,
      },
    })

    test(`new expense ${frame.frameId}`, async ({ page }) => {
      await signInAsDemo(page)
      await page.goto('/operations?add=expense')

      const sheet = page.getByRole('dialog')

      await pickCategory(page, sheet)
      await sheet.getByLabel('Час').fill('18:40')
      await sheet.getByLabel('Одержувач').fill('Сільпо')
      await sheet.getByLabel('Коментар').fill('Продукти на тиждень')
      // the frame shows the amount field focused
      await sheet.getByLabel('Сума').fill('812,40')
      await matchFrame(page, frame)
    })
  })
}

test.describe('desktop edit', () => {
  test.use({
    viewport: {
      width: 1440,
      height: 900,
    },
  })

  test('edit with errors 5:101464', async ({ page }) => {
    await signInAsDemo(page)
    await page.goto('/operations')
    await page.getByRole('row', { name: /Сільпо.*1 108,25/ }).click()

    const sheet = page.getByRole('dialog')

    await sheet.getByLabel('Дата').fill('26.11.2026')
    await sheet.getByLabel('Час').fill('18:40')
    await sheet.getByLabel('Одержувач').fill('')
    await sheet.getByLabel('Коментар').fill('Продукти на вихідні')
    await sheet.getByRole('button', { name: 'Зберегти зміни' }).click()
    await sheet.getByLabel('Сума').focus()
    await matchFrame(page, {
      frameId: '5:101464',
      width: 1440,
      height: 900,
    })
  })
})
