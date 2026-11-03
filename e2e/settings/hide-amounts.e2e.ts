import { expect } from '@playwright/test'
import { pickCategory } from '../fixtures/category.fixture'
import { ensureIncomeDate } from '../fixtures/overview.fixture'
import { test } from '../fixtures/roles.fixture'

// a shown sum has the decimal comma and two digits («1 234,56 ₴»); hidden ones read «•••• ₴»
const SHOWN_SUM = /\d,\d{2}/

test('«Приховати суми» ховає й суми в тексті: герой Огляду і плитки Бюджету', async ({ pageAs }) => {
  const page = await pageAs('owner')

  await ensureIncomeDate(page)

  // the tiles need a month with a limit: on a fresh database the budget is its empty state
  await page.goto('/budget')

  const addLimit = page.getByRole('button', { name: 'Додати ліміт' })

  await expect(addLimit.or(page.getByText('Результат, факт', { exact: true })).first()).toBeVisible()

  if (await addLimit.isVisible()) {
    await addLimit.click()

    const limit = page.getByRole('dialog')

    await pickCategory(page, limit, 'Кафе')
    await limit.getByLabel('Ліміт на місяць').fill('1000')
    await limit.getByRole('button', { name: 'Зберегти' }).click()
    await expect(limit).toBeHidden()
  }

  await page.goto('/settings/general')

  const hide = page.getByRole('switch', { name: 'Приховати суми' })

  await hide.click()
  await expect(hide).toBeChecked()

  await page.goto('/')

  const hero = page
    .locator('section')
    .filter({ has: page.getByText('= Доступно', { exact: true }) })
    .last()

  await expect(hero).toContainText('••••')
  await expect(hero).not.toContainText(SHOWN_SUM)

  await page.goto('/budget')

  const tiles = page
    .locator('dl')
    .filter({ has: page.getByText('Результат, факт', { exact: true }) })
    .first()

  // the result tile of the current month adds «with the plans to the month end: <sum>»
  await expect(tiles).toContainText('з планом до кінця місяця: ')
  await expect(tiles).toContainText('••••')
  await expect(tiles).not.toContainText(SHOWN_SUM)
})
