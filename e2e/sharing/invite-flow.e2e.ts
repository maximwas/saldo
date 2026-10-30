import { expect } from '@playwright/test'
import { DEMO } from '../fixtures/demo-data.fixture'
import { availableMinor, ensureIncomeDate } from '../fixtures/overview.fixture'
import { test } from '../fixtures/roles.fixture'

test('запрошення: нова людина стає editor і бачить ту саму цифру «Доступно»; після «Відкликати» простір зникає', async ({
  pageAs,
  browser,
  baseURL,
  locale,
  timezoneId,
}) => {
  const owner = await pageAs('owner')
  const email = `guest-${crypto.randomUUID().slice(0, 8)}@example.com`

  await ensureIncomeDate(owner)

  const ownerAvailable = await availableMinor(owner)

  // owner creates the invite and copies the link from the one-time step
  await owner.goto('/settings/access')
  await owner.getByRole('button', { name: 'Запросити' }).click()

  const invite = owner.getByRole('dialog')

  await invite.getByLabel('Email').fill(email)
  await invite.getByLabel('Роль').click()
  await owner.getByRole('option', { name: 'Редагує' }).click()
  await invite.getByRole('button', { name: 'Створити посилання' }).click()

  const link = await invite.getByLabel('Посилання').inputValue()

  expect(link).toContain('/invite/')
  await invite.getByRole('button', { name: 'Готово' }).click()

  // a new person: no session, no account yet; the link creates the account for the invited email and accepts
  const context = await browser.newContext({
    baseURL,
    locale,
    timezoneId,
  })

  try {
    const guest = await context.newPage()

    await guest.goto(link)
    await guest.getByLabel('Пароль для нового акаунта').fill('saldo-e2e-guest-password')
    await guest.getByRole('button', { name: 'Створити акаунт і прийняти' }).click()
    await expect(guest).toHaveURL('/')
    await expect(guest.getByRole('button', { name: new RegExp(`${DEMO.ownerLedgerName}.*Редагує`) })).toBeVisible()
    expect(await availableMinor(guest)).toBe(ownerAvailable)

    // owner revokes the access; after a reload the shared space is gone from the editor's switcher
    await owner.goto('/settings/access')
    await owner
      .getByRole('listitem')
      .filter({ hasText: email })
      .getByRole('button', { name: 'Відкликати доступ' })
      .click()
    await owner.getByRole('dialog').getByRole('button', { name: 'Відкликати доступ' }).click()
    await expect(owner.getByRole('listitem').filter({ hasText: email })).toHaveCount(0)

    await guest.reload()
    await guest
      .getByRole('button', { name: /Власник|Редагує|Переглядає/ })
      .first()
      .click()
    await expect(guest.getByRole('menuitem', { name: 'Створити простір' })).toBeVisible()
    await expect(guest.getByRole('menuitem', { name: new RegExp(DEMO.ownerLedgerName) })).toHaveCount(0)
  } finally {
    await context.close()
  }
})
