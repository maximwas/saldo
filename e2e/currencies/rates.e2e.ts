import { expect, type Page } from '@playwright/test'
import { seedRates } from '../fixtures/rates.fixture'
import { test } from '../fixtures/roles.fixture'

const ratesCard = (page: Page) =>
  page.locator('section').filter({
    has: page.getByRole('heading', {
      name: 'Курси',
      exact: true,
    }),
  })

test.beforeEach(async () => {
  await seedRates()
})

test('картка «Курси» на Огляді показує долар і євро: курс, ручний курс і зміну за день', async ({ pageAs }) => {
  const page = await pageAs('owner')

  await page.goto('/')

  const card = ratesCard(page)
  const dollar = card.getByRole('listitem').filter({ hasText: 'Долар США' })
  const euro = card.getByRole('listitem').filter({ hasText: 'Євро' })

  await expect(card.getByRole('listitem')).toHaveCount(2)
  await expect(dollar).toContainText('41,60 ₴')
  await expect(dollar).toContainText('+0,12')
  // today's manual 41,50 beats NBU's 41,38 and is compared with yesterday's NBU 41,44
  await expect(euro).toContainText('EUR · вручну')
  await expect(euro).toContainText('41,50 ₴')
  await expect(euro).toContainText('+0,06')
  await expect(card).toContainText('зміна за день')
})

test('третя позначена валюта зʼявляється на картці, четверту позначити не можна', async ({ pageAs }) => {
  const page = await pageAs('owner')

  await page.goto('/')

  const card = ratesCard(page)

  await card.getByRole('button', { name: 'Усі курси' }).click()

  const dialog = page.getByRole('dialog', { name: 'Курси валют' })

  await expect(dialog.getByText('В огляді · 2')).toBeVisible()
  await expect(dialog.getByText(/EUR · \d{2}\.\d{2} · НБУ 41,38/)).toBeVisible()
  await dialog.getByRole('checkbox', { name: /Польський злотий/ }).click()

  await expect(dialog.getByText('В огляді · 3')).toBeVisible()
  await expect(dialog.getByRole('checkbox', { name: /Польський злотий/ })).toBeChecked()
  await expect(dialog.getByRole('checkbox', { name: /Англійський фунт/ })).toBeDisabled()
  await expect(
    dialog.getByText('В огляді вміщаються 3 валюти. Зніміть позначку з однієї, щоб додати іншу.'),
  ).toBeVisible()

  await dialog.getByRole('button', { name: 'Готово' }).click()
  await expect(dialog).toBeHidden()
  await expect(card.getByRole('listitem').filter({ hasText: 'Польський злотий' })).toContainText('9,65 ₴')

  // the pins are the member's own row: a reload keeps all three
  await page.reload()
  await expect(ratesCard(page).getByRole('listitem')).toHaveCount(3)
})
