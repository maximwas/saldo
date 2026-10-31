import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database.types'
import { pickCategory } from '../fixtures/category.fixture'
import { DEMO } from '../fixtures/demo-data.fixture'
import { test } from '../fixtures/roles.fixture'
import { E2E_PASSWORD, emailOf } from '../fixtures/users.fixture'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

const admin = () =>
  createClient<Database>(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY ?? '', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

/** the production service worker controls the page, and this page went through it once, so it is in its cache */
async function cachedByWorker(page: Page, path: string) {
  await page.goto(path)
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await page.reload()
}

// microsoft/playwright#2311: the emulated offline mode must reach the service worker too, else «offline» lies
const supabaseReachable = (page: Page) =>
  page.evaluate(
    (url) =>
      fetch(`${url}/rest/v1/`).then(
        () => true,
        () => false,
      ),
    SUPABASE_URL,
  )

const status = (page: Page, text: RegExp) => page.getByRole('button', { name: text })

/** the emulated network drop, once the page itself has seen it (the app's queue follows the offline event) */
async function goOffline(page: Page) {
  await page.context().setOffline(true)
  await page.waitForFunction(() => !navigator.onLine)
}

test('офлайн-витрата чекає в черзі, переживає reload і синхронізується одним рядком', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`
  const row = page.getByRole('row', { name: new RegExp(mark) })

  await cachedByWorker(page, '/operations')
  await page.waitForLoadState('networkidle')
  await goOffline(page)
  expect(await supabaseReachable(page)).toBe(false)

  await page.getByRole('button', { name: 'Додати' }).click()

  const sheet = page.getByRole('dialog')

  await sheet.getByLabel('Сума').fill('77,10')
  await sheet.getByLabel('Одержувач').fill(mark)
  await pickCategory(page, sheet)
  await sheet.getByRole('button', { name: 'Зберегти' }).click()
  await expect(sheet).toBeHidden()
  await expect(status(page, /очікує \(1\)/i)).toBeVisible()
  await expect(row).toContainText('Очікує')

  // offline reload: the worker serves the shell, IndexedDB the cached list and the queue
  await page.reload()
  await expect(page.getByRole('alert').filter({ hasText: 'Немає мережі' })).toBeVisible()
  await expect(status(page, /очікує \(1\)/i)).toBeVisible()
  await expect(row).toHaveCount(1)

  await page.context().setOffline(false)
  await expect(status(page, /Синхронізовано/)).toBeVisible({ timeout: 30_000 })

  await page.reload()
  await expect(row).toHaveCount(1)
  await expect(row).not.toContainText('Очікує')
})

test('editor офлайн і owner онлайн оплачують один платіж: одна оплата, в editor конфлікт', async ({ pageAs }) => {
  test.setTimeout(60_000)
  const owner = await pageAs('owner')
  const editor = await pageAs('editor')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await owner.goto('/payments')
  await owner.getByRole('button', { name: 'Додати платіж' }).click()

  const form = owner.getByRole('dialog')

  await form.getByLabel('Назва').fill(mark)
  await form.getByLabel('Сума').fill('240')
  await form.getByRole('button', { name: 'Зберегти' }).click()
  await expect(form).toBeHidden()

  await editor.goto('/payments')

  const editorItem = editor.getByRole('listitem').filter({ hasText: mark })

  await editorItem.getByRole('button', { name: 'Оплачено' }).click()

  const editorPay = editor.getByRole('dialog')

  // the sheet loads its accounts online; the payment itself is sent offline
  await expect(editorPay.getByRole('button', { name: 'Оплачено' })).toBeEnabled()
  await goOffline(editor)
  await editorPay.getByRole('button', { name: 'Оплачено' }).click()
  await expect(editorPay).toBeHidden()
  await expect(status(editor, /очікує \(1\)/i)).toBeVisible()

  await owner.getByRole('listitem').filter({ hasText: mark }).getByRole('button', { name: 'Оплачено' }).click()

  const ownerPay = owner.getByRole('dialog')

  await ownerPay.getByRole('button', { name: 'Оплачено' }).click()
  await expect(ownerPay).toBeHidden()
  await expect(owner.getByRole('listitem').filter({ hasText: mark })).toContainText('Оплачено')

  // back online the editor's payment carries a stale version: PT409, kept for the person to decide
  await editor.context().setOffline(false)
  await status(editor, /Конфлікт \(1\)/).click({ timeout: 30_000 })
  await editor.getByRole('button', { name: "Розв'язати" }).click()
  await expect(editor.getByRole('dialog')).toContainText(`Підтвердив(ла) ${DEMO.ownerName}`)

  const database = admin()
  const { data: obligation } = await database.from('obligations').select('id').eq('title', mark).single()
  const { count } = await database
    .from('obligation_payments')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('obligation_id', obligation?.id ?? '')

  expect(count).toBe(1)
})

test('вихід очищає IndexedDB і кеші пристрою', async ({ browser, baseURL, locale, timezoneId }) => {
  // a fresh login, not a saved state: signing out ends this session only, the saved ones of other specs stay valid
  const context = await browser.newContext({
    baseURL,
    locale,
    timezoneId,
  })
  const page = await context.newPage()
  const deviceData = () => page.evaluate(async () => (await indexedDB.databases()).length)

  await page.goto('/login')
  await page.getByLabel('Email').fill(emailOf('viewer'))
  await page.getByLabel('Пароль').fill(E2E_PASSWORD)
  await page.getByRole('button', { name: 'Увійти' }).click()
  await expect(page).toHaveURL('/')
  await expect.poll(deviceData).toBeGreaterThan(0)

  await page.goto('/settings')
  await page.getByRole('button', { name: 'Вийти з акаунта' }).click()
  await expect(page).toHaveURL(/\/login/)
  // the worker's own cache-expiry bookkeeping (Serwist) opens again with /login; nothing of the person is left
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await indexedDB.databases()).map(({ name }) => name).filter((name) => name !== 'serwist-expiration'),
      ),
    )
    .toEqual([])
  // the worker caches /login itself again at once; no signed-in page survives in any cache
  expect(await page.evaluate(async () => Boolean(await caches.match('/settings')))).toBe(false)
  await context.close()
})
