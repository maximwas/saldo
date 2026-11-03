import { expect, type Page } from '@playwright/test'
import { pickCategory } from '../fixtures/category.fixture'
import { test } from '../fixtures/roles.fixture'

const PHOTO = 'img[src^="/api/avatars/"]'

/** a made-up picture drawn in the browser: two colour bands, no real photo */
async function madeUpPng(page: Page) {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')

    canvas.width = 600
    canvas.height = 400

    const context = canvas.getContext('2d')

    if (context) {
      context.fillStyle = '#2b66f6'
      context.fillRect(0, 0, 600, 200)
      context.fillStyle = '#f2b705'
      context.fillRect(0, 200, 600, 200)
    }

    return canvas.toDataURL('image/png')
  })

  return Buffer.from(dataUrl.split(',')[1] ?? '', 'base64')
}

test('фото профілю: перевірка файлу, обрізка й збереження — фото в Налаштуваннях, Sidebar і рядку спільного простору', async ({
  pageAs,
}) => {
  const editor = await pageAs('editor')

  await editor.goto('/settings/general')

  const card = editor.locator('section').filter({ has: editor.getByRole('heading', { name: "Ваше ім'я і фото" }) })
  const input = editor.locator('input[type="file"]')
  const dialog = editor.getByRole('dialog', { name: 'Фото профілю' })

  // the file is checked before the editor: too big, then not a photo. The card streams in, so the first pick is
  // repeated until the field has hydrated and reacts
  await expect(async () => {
    await input.setInputFiles({
      name: 'big.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(11 * 1024 * 1024),
    })
    await expect(dialog.getByText('Фото завелике (11 МБ). Виберіть фото до 10 МБ.')).toBeVisible({ timeout: 1000 })
  }).toPass()
  await expect(dialog.getByRole('button', { name: 'Вибрати фото' })).toBeVisible()
  await input.setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a photo'),
  })
  await expect(dialog.getByText('Це не фото. Виберіть фото у форматі JPG, PNG або WebP.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Скасувати' }).click()
  await expect(dialog).toBeHidden()

  await input.setInputFiles({
    name: 'made-up.png',
    mimeType: 'image/png',
    buffer: await madeUpPng(editor),
  })
  await expect(dialog.getByText('Так вас побачать інші')).toBeVisible()
  await dialog.getByRole('slider', { name: 'Масштаб' }).press('ArrowRight')
  await dialog.getByRole('button', { name: 'Зберегти' }).click()
  await expect(editor.getByText('Фото збережено')).toBeVisible()
  await expect(dialog).toBeHidden()
  await expect(card.locator(PHOTO)).toBeVisible()
  await expect(editor.locator('aside').locator(PHOTO)).toBeVisible()

  // the photo stands for the author in the owner's shared space
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await editor.goto('/operations?add=expense')

  const sheet = editor.getByRole('dialog')

  await sheet.getByLabel('Сума').fill('42,00')
  await sheet.getByLabel('Одержувач').fill(mark)
  await pickCategory(editor, sheet)
  await sheet.getByRole('button', { name: 'Зберегти' }).click()
  await expect(sheet).toBeHidden()

  const owner = await pageAs('owner')

  await owner.goto('/operations')

  const author = owner.getByRole('row', { name: new RegExp(mark) }).getByRole('img', { name: 'Додав(ла): Олена' })

  await expect(author.locator(PHOTO)).toBeVisible()

  // removing the photo brings the letter back
  await editor.goto('/settings/general')
  await card.getByRole('button', { name: 'Прибрати фото' }).click()
  await expect(editor.getByText('Фото прибрано')).toBeVisible()
  await expect(card.locator(PHOTO)).toHaveCount(0)
  await expect(card.getByRole('button', { name: 'Прибрати фото' })).toHaveCount(0)
})
