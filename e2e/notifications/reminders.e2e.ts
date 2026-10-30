import { expect, type Page } from '@playwright/test'
import { addReminderSubscription, admin, callRemindersCron } from '../fixtures/reminders.fixture'
import { test } from '../fixtures/roles.fixture'

const centre = (page: Page, mark: string) => page.getByRole('listitem').filter({ hasText: mark })

test('двічі викликаний крон дає одне сповіщення, «Прочитано» переносить його в прочитані', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await addReminderSubscription(page, mark)
  await callRemindersCron(page)
  await callRemindersCron(page)
  await page.goto('/notifications')
  await expect(centre(page, mark)).toHaveCount(1)

  const fresh = page.locator('section').filter({
    has: page.getByRole('heading', {
      name: 'Нові',
      exact: true,
    }),
  })

  await centre(page, mark)
    .getByRole('button', {
      name: 'Прочитано',
      exact: true,
    })
    .click()
  await expect(fresh.getByRole('listitem').filter({ hasText: mark })).toHaveCount(0)
  await expect(
    page
      .locator('section')
      .filter({
        has: page.getByRole('heading', {
          name: 'Прочитані',
          exact: true,
        }),
      })
      .getByRole('listitem')
      .filter({ hasText: mark }),
  ).toHaveCount(1)
})

test('push: відмова в дозволі пояснюється, дозвіл створює рядок у push_subscriptions', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const endpoint = `https://push.example.test/e2e-${crypto.randomUUID()}`

  // headless Chromium has no push service: the page gets a fixed fake subscription, the permission is the real one
  await page.context().addInitScript((fakeEndpoint) => {
    const fake = {
      endpoint: fakeEndpoint,
      toJSON: () => ({
        endpoint: fakeEndpoint,
        keys: {
          p256dh: 'e2e-p256dh',
          auth: 'e2e-auth',
        },
      }),
      unsubscribe: async () => true,
    }
    let current: typeof fake | null = null

    // headless Chromium dismisses the prompt instead of denying it: answer it like a browser would
    Notification.requestPermission = async () =>
      (await navigator.permissions.query({ name: 'notifications' })).state === 'granted' ? 'granted' : 'denied'
    PushManager.prototype.subscribe = async () => {
      current = fake

      return fake as unknown as PushSubscription
    }
    PushManager.prototype.getSubscription = async () => current as unknown as PushSubscription
  }, endpoint)

  // no permission yet: the answer is «denied» and the card turns into the explanation
  await page.goto('/notifications')
  await page.getByRole('button', { name: 'Увімкнути' }).click()
  await expect(page.getByRole('heading', { name: 'Сповіщення заблоковано в браузері' })).toBeVisible()

  await page.context().grantPermissions(['notifications'], { origin: new URL(page.url()).origin })
  await page.reload()
  await page.getByRole('button', { name: 'Увімкнути' }).click()
  await expect(page.getByRole('button', { name: 'Вимкнути' })).toBeVisible()

  const { data } = await admin.from('push_subscriptions').select('endpoint').eq('endpoint', endpoint)

  expect(data).toHaveLength(1)
  await admin.from('push_subscriptions').delete().eq('endpoint', endpoint)
})

test('після «Оплачено» крон нового сповіщення не дає', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const paid = `e2e-${crypto.randomUUID().slice(0, 8)}`
  const control = `e2e-${crypto.randomUUID().slice(0, 8)}`

  await addReminderSubscription(page, paid)
  await addReminderSubscription(page, control)
  await page.goto('/payments')
  await page.getByRole('listitem').filter({ hasText: paid }).first().getByRole('button', { name: 'Оплачено' }).click()

  const pay = page.getByRole('dialog')

  await pay.getByRole('button', { name: 'Оплачено' }).click()
  await expect(pay).toBeHidden()
  await callRemindersCron(page)
  await page.goto('/notifications')
  await expect(centre(page, control)).toHaveCount(1)
  await expect(centre(page, paid)).toHaveCount(0)
})
