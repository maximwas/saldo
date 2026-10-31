import { expect } from '@playwright/test'
import { DEMO } from '../fixtures/demo-data.fixture'
import { availableMinor, ensureIncomeDate } from '../fixtures/overview.fixture'
import { test } from '../fixtures/roles.fixture'
import { emailOf } from '../fixtures/users.fixture'

test('запрошення: людина з акаунтом Saldo стає editor і бачить ту саму цифру «Доступно»; після «Відкликати» простір зникає', async ({
  pageAs,
}) => {
  const owner = await pageAs('owner')
  const email = emailOf('stranger')

  await ensureIncomeDate(owner)

  const ownerAvailable = await availableMinor(owner)

  // owner creates the invite and copies the link from the one-time step; an email without a Saldo account is refused
  // under the field (Figma 32:94877)
  await owner.goto('/settings/access')
  await owner.getByRole('button', { name: 'Запросити' }).click()

  const invite = owner.getByRole('dialog')

  await invite.getByLabel('Email').fill(`guest-${crypto.randomUUID().slice(0, 8)}@example.com`)
  await invite.getByRole('button', { name: 'Створити посилання' }).click()
  await expect(invite.getByText('Користувача з такою поштою немає в Saldo')).toBeVisible()
  await invite.getByLabel('Email').fill(email)
  await invite.getByLabel('Роль').click()
  await owner.getByRole('option', { name: 'Редагує' }).click()
  await invite.getByRole('button', { name: 'Створити посилання' }).click()

  const link = await invite.getByLabel('Посилання').inputValue()

  expect(link).toContain('/invite/')
  await invite.getByRole('button', { name: 'Готово' }).click()

  // the invitee is signed in to their own account and accepts
  const guest = await pageAs('stranger')

  await guest.goto(link)
  await guest.getByRole('button', { name: 'Прийняти' }).click()
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
})
