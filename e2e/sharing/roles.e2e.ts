import { expect } from '@playwright/test'
import { pickCategory } from '../fixtures/category.fixture'
import { DEMO } from '../fixtures/demo-data.fixture'
import { test } from '../fixtures/roles.fixture'

test('editor вносить витрату — owner бачить її з ініціалом автора', async ({ pageAs }) => {
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

  await expect(row).toHaveCount(1)
  await expect(row.getByRole('img', { name: `Автор: ${DEMO.editorName}` })).toHaveText(DEMO.editorName.charAt(0))
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
