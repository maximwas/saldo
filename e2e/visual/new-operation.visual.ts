import { expect, type Locator, type Page, test } from '@playwright/test'
import { pickCategory } from '../fixtures/category.fixture'
import { matchDialog, matchFrame, signInAsDemo } from './match-frame.fixture'

// Figma «Saldo», page 1:104: section 2:16566 (new expense and income) and section 2:11402 (the edit frames)
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

const INCOME_FRAMES = [
  {
    device: 'desktop',
    frameId: '2:17848',
    width: 1440,
    height: 1080,
  },
  {
    device: 'mobile',
    frameId: '2:19885',
    width: 390,
    height: 1128,
  },
]

// the edit frames with errors (5:101464 / 32:95477) and the same with the «···» menu open (33:101623 / 33:101738)
const EDIT_FRAMES = [
  {
    device: 'desktop',
    frameId: '5:101464',
    menuFrameId: '33:101623',
    width: 1440,
    height: 900,
  },
  {
    device: 'mobile',
    frameId: '32:95477',
    menuFrameId: '33:101738',
    width: 390,
    height: 978,
  },
]

/** desktop frames compare the dialog's box (matchDialog), mobile ones the whole frame */
type VisualFrame = {
  device: string
  frameId: string
  width: number
  height: number
}

const match = (page: Page, frame: VisualFrame) =>
  frame.device === 'desktop' ? matchDialog(page, frame) : matchFrame(page, frame)

/** a day of the open date picker by its accessible name, e.g. 26 November in Ukrainian (a month view also shows its neighbours' days) */
async function pickDay(page: Page, day: string) {
  await page
    .getByRole('gridcell')
    .getByRole('button', { name: new RegExp(day) })
    .click()
}

/** the Silpo groceries expense of demo-data.md with the frame's edits: a future date, no payee, another comment, then save */
async function editWithErrors(page: Page): Promise<Locator> {
  await signInAsDemo(page)
  await page.goto('/operations')
  // a table row on desktop, a button on mobile
  await page
    .getByRole('row', { name: /Сільпо.*1 108,25/ })
    .or(page.getByRole('button', { name: /Сільпо.*1 108,25/ }))
    .click()

  const sheet = page.getByRole('dialog')

  await sheet.getByLabel('Дата').click()
  await page.getByRole('button', { name: 'Наступний місяць' }).click()
  await pickDay(page, '26-е листопада')
  await sheet.getByLabel('Час').fill('18:40')
  await sheet.getByLabel('Одержувач').fill('')
  await sheet.getByLabel('Коментар').fill('Продукти на вихідні')
  await sheet.getByRole('button', { name: 'Зберегти зміни' }).click()
  await expect(sheet.getByText('Вкажіть одержувача')).toBeVisible()

  return sheet
}

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
      await match(page, frame)
    })
  })
}

for (const frame of INCOME_FRAMES) {
  test.describe(`${frame.device} income`, () => {
    test.use({
      viewport: {
        width: frame.width,
        height: frame.height,
      },
    })

    test(`new income ${frame.frameId}`, async ({ page }) => {
      await signInAsDemo(page)
      await page.goto('/operations?add=income')

      const sheet = page.getByRole('dialog')

      await sheet.getByLabel('Рахунок').click()
      await page.getByRole('option', { name: /Валютний EUR/ }).click()
      await pickCategory(page, sheet, 'Фриланс')
      await sheet.getByLabel('Дата').click()
      await pickDay(page, '17-е жовтня')
      await sheet.getByLabel('Час').fill('10:00')
      await sheet.getByLabel('Джерело').fill('Замовник проєкту')
      await sheet.getByLabel('Коментар').fill('Оплата за другий етап')
      await sheet.getByLabel('Сума').fill('2 050,00')
      await match(page, frame)
    })
  })
}

for (const frame of EDIT_FRAMES) {
  test.describe(`${frame.device} edit`, () => {
    test.use({
      viewport: {
        width: frame.width,
        height: frame.height,
      },
    })

    test(`edit with errors ${frame.frameId}`, async ({ page }) => {
      const sheet = await editWithErrors(page)

      await sheet.getByLabel('Сума').focus()
      await match(page, frame)
    })

    test(`edit menu ${frame.menuFrameId}`, async ({ page }) => {
      const sheet = await editWithErrors(page)

      await sheet.getByRole('button', { name: 'Дії з операцією' }).click()
      await expect(page.getByRole('menuitem', { name: 'Видалити' })).toBeVisible()
      await match(page, {
        ...frame,
        frameId: frame.menuFrameId,
      })
    })
  })
}
