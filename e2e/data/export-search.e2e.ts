import { readFile } from 'node:fs/promises'
import { expect, type Page } from '@playwright/test'
import { test } from '../fixtures/roles.fixture'

// an expense of 125,50 with the mark as its note, saved through the global «Add»
async function addExpense(page: Page, mark: string) {
  await page.goto('/operations?add=expense')

  const sheet = page.getByRole('dialog')

  await sheet.getByLabel('Сума').fill('125,50')
  await sheet.getByLabel('Коментар').fill(mark)
  await sheet.getByRole('button', { name: 'Зберегти' }).click()
  await expect(sheet).toBeHidden()
}

test('CSV-експорт містить операцію, створену тестом', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await addExpense(page, mark)
  await page.goto('/settings/data')

  const download = page.waitForEvent('download')

  await page.getByRole('button', { name: 'Операції (CSV)' }).click()

  const file = await download
  const csv = await readFile(await file.path(), 'utf8')
  const line = csv.split('\r\n').find((row) => row.includes(mark))

  expect(file.suggestedFilename()).toMatch(/^saldo-operations-\d{4}-\d{2}-\d{2}\.csv$/)
  expect(csv.split('\r\n')[0]).toContain('date,kind,amount,currency')
  expect(line).toMatch(/^\d{4}-\d{2}-\d{2},expense,-125\.50,UAH,/)
})

test('⌘K знаходить операцію за коментарем і відкриває її', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await addExpense(page, mark)
  await page.goto('/')
  await page.keyboard.press('ControlOrMeta+k')

  const palette = page.getByRole('dialog', { name: 'Пошук' })

  await palette.getByRole('combobox').fill(mark)
  await expect(
    palette.getByRole('group', { name: 'Операції' }).getByRole('option', { name: new RegExp(mark) }),
  ).toBeVisible()
  // the first result is highlighted: Enter opens it
  await palette.getByRole('combobox').press('Enter')

  await expect(page).toHaveURL(/\/operations\?period=\d{4}-\d{2}/)
  await expect(page.getByRole('dialog').getByLabel('Коментар')).toHaveValue(mark)
})

test('«Видалити всі дані» бачить лише власник, viewer — тільки експорт @mobile', async ({ pageAs }) => {
  const owner = await pageAs('owner')

  await owner.goto('/settings/data')
  await expect(owner.getByRole('button', { name: 'Видалити всі дані' })).toBeVisible()

  const viewer = await pageAs('viewer')

  await viewer.goto('/settings/data')
  await expect(viewer.getByRole('button', { name: 'Операції (CSV)' })).toBeVisible()
  await expect(viewer.getByRole('button', { name: 'Видалити всі дані' })).toHaveCount(0)
})
