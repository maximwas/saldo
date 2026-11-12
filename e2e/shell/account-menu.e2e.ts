import { devices, expect } from '@playwright/test'
import { test } from '../fixtures/roles.fixture'
import { E2E_PASSWORD, emailOf } from '../fixtures/users.fixture'

test('мій акаунт унизу Sidebar: меню з «Налаштування акаунта» і «Вийти»', async ({
  browser,
  baseURL,
  locale,
  timezoneId,
}) => {
  // a fresh login, not a saved state: signing out ends this session only, the saved ones of other specs stay valid
  const context = await browser.newContext({
    baseURL,
    locale,
    timezoneId,
  })
  const page = await context.newPage()

  await page.goto('/login')
  await page.getByLabel('Email').fill(emailOf('viewer'))
  await page.getByLabel('Пароль').fill(E2E_PASSWORD)
  await page.getByRole('button', { name: 'Увійти' }).click()
  await expect(page).toHaveURL('/')

  const account = page.getByRole('button', { name: 'Мій акаунт' })

  await expect(account).toContainText(emailOf('viewer'))
  await account.click()
  await page.getByRole('menuitem', { name: 'Налаштування акаунта' }).click()
  await expect(page).toHaveURL('/settings/general')

  await account.click()
  await page.getByRole('menuitem', { name: 'Вийти' }).click()
  await expect(page).toHaveURL(/\/login/)
  await context.close()
})

test('картка акаунта вгорі «Простору» веде в Загальні @mobile', async ({ pageAs }) => {
  const page = await pageAs('owner')

  await page.goto('/space')

  const card = page.getByRole('link', { name: new RegExp(emailOf('owner')) })

  await expect(card).toContainText('Максим')
  await card.click()
  await expect(page).toHaveURL('/settings/general')
})

test('на телефоні «Вийти з акаунта» у «Просторі» веде на вхід, навіть коли очищення пристрою зависло @mobile', async ({
  browser,
  baseURL,
  locale,
  timezoneId,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'the phone layout signs out from the «Space» page')

  // a fresh login, not a saved state: signing out ends this session only, the saved ones of other specs stay valid
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    baseURL,
    locale,
    timezoneId,
  })
  const page = await context.newPage()

  await page.goto('/login')
  await page.getByLabel('Email').fill(emailOf('viewer'))
  await page.getByLabel('Пароль').fill(E2E_PASSWORD)
  await page.getByRole('button', { name: 'Увійти' }).click()
  await expect(page).toHaveURL('/')

  await page.goto('/space')
  // QA 12.11 (390 px): the session cookie went, the button stayed disabled and the page never left. A cleanup that
  // never settles (an IndexedDB request held by another connection) stands in for whatever held it there
  await page.evaluate(() => {
    indexedDB.databases = () => new Promise(() => undefined)
  })
  await page.getByRole('button', { name: 'Вийти з акаунта' }).click()
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  await context.close()
})
