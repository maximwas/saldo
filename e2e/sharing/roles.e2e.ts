import { expect } from '@playwright/test'
import { pickCategory } from '../fixtures/category.fixture'
import { test } from '../fixtures/roles.fixture'

test('editor вносить витрату — owner бачить її у своєму списку', async ({ pageAs }) => {
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`
  const editor = await pageAs('editor')

  await editor.goto('/operations?add=expense')

  const sheet = editor.getByRole('dialog')

  await sheet.getByLabel('Сума').fill('125,50')
  await sheet.getByLabel('Одержувач').fill(mark)
  await pickCategory(editor, sheet)
  await sheet.getByRole('button', { name: 'Зберегти' }).click()
  await expect(sheet).toBeHidden()

  const owner = await pageAs('owner')

  await owner.goto('/operations')

  const row = owner.getByRole('row', { name: new RegExp(mark) })

  // a space of two or more people names the author before the amount, never before the title (Figma TableRow 2:9770)
  await expect(row.getByRole('img', { name: 'Додав(ла): Олена' })).toBeVisible()
})

test('у просторі однієї людини автора не видно', async ({ pageAs }) => {
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`
  const stranger = await pageAs('stranger')

  // the stranger's own space has no account yet, so a planned payment (no account needed, due today) is the record
  await stranger.goto('/payments')
  await stranger.getByRole('button', { name: /^Додати (плановий )?платіж$/ }).click()

  const form = stranger.getByRole('dialog')

  await form.getByLabel('Назва').fill(mark)
  await form.getByLabel('Сума').fill('12,00')
  await form.getByRole('button', { name: 'Зберегти' }).click()
  await expect(form).toBeHidden()

  const row = stranger.getByRole('listitem').filter({ hasText: mark })

  await expect(row).toHaveCount(1)
  await expect(row.getByRole('img', { name: /Додав\(ла\)/ })).toHaveCount(0)
})

test('viewer не бачить «Додати», а ?add=expense нічого не відкриває й не зберігає @mobile', async ({ pageAs }) => {
  const viewer = await pageAs('viewer')

  await viewer.goto('/operations')
  await expect(
    viewer.getByRole('heading', {
      name: 'Операції',
      level: 1,
    }),
  ).toBeVisible()
  await expect(
    viewer.getByRole('button', {
      name: 'Додати',
      exact: true,
    }),
  ).toHaveCount(0)

  await viewer.goto('/operations?add=expense')
  await expect(
    viewer.getByRole('heading', {
      name: 'Операції',
      level: 1,
    }),
  ).toBeVisible()
  await expect(viewer.getByRole('dialog')).toHaveCount(0)
  await expect(viewer.getByRole('button', { name: 'Зберегти' })).toHaveCount(0)
})
