import { expect } from '@playwright/test'
import { pickCategory } from '../fixtures/category.fixture'
import { test } from '../fixtures/roles.fixture'

const CATEGORY = 'Продукти'

test('витрата понад ліміт категорії показує «Понад ліміт» у Бюджеті', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await page.goto('/budget')
  await page.getByRole('button', { name: 'Додати ліміт' }).first().click()

  const limit = page.getByRole('dialog')

  await pickCategory(page, limit, CATEGORY)
  await limit.getByLabel('Ліміт на місяць').fill('1')
  await limit.getByRole('button', { name: 'Зберегти' }).click()
  await expect(limit).toBeHidden()

  await page.goto('/operations?add=expense')

  const expense = page.getByRole('dialog')

  await expense.getByLabel('Сума').fill('50')
  await expense.getByLabel('Одержувач').fill(mark)
  await pickCategory(page, expense, CATEGORY)
  await expense.getByRole('button', { name: 'Зберегти' }).click()
  await expect(expense).toBeHidden()

  await page.goto('/budget')

  const row = page.getByRole('listitem').filter({ hasText: CATEGORY })

  await expect(row).toContainText('Понад ліміт на')
  await expect(row).toContainText('з 1,00')
})
