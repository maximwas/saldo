import { expect } from '@playwright/test'
import { addPlannedPayment, shortDay as short } from '../fixtures/planned-payment.fixture'
import { test } from '../fixtures/roles.fixture'
import { kyivToday } from '../fixtures/subscriptions.fixture'

test('запис календаря відкриває попап, «Оплачено» пише факт на сьогодні й лишає позначку на дні плану', async ({
  pageAs,
}) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`
  const today = kyivToday()
  // the plan sits on another day of this month, so after paying today its own day keeps the «paid» mark
  const planDay = today.endsWith('-15') ? 16 : 15
  const plan = `${today.slice(0, 8)}${planDay}`

  await addPlannedPayment(page, mark, '350', planDay)

  // the search keeps the cells to this test's own entries
  await page.goto(`/calendar?q=${mark}`)

  const planCell = page.locator(`[data-day="${plan}"]`)

  await planCell
    .getByRole('button', {
      name: mark,
      exact: true,
    })
    .click()

  const popup = page.getByRole('dialog', { name: mark })

  await expect(popup).toContainText(`Заплановано на ${short(plan)}`)
  await expect(page).not.toHaveURL(/view=day/)
  await popup
    .getByRole('button', {
      name: 'Оплатити',
      exact: true,
    })
    .click()

  const pay = page.getByRole('dialog', { name: `Оплатити ${mark}` })

  await expect(pay).toContainText(`Сьогодні, ${short(today)}`)
  await pay
    .getByRole('button', {
      name: 'Оплачено',
      exact: true,
    })
    .click()
  await expect(pay).toBeHidden()
  await expect(page.getByText(`Оплачено · записано на ${short(today)}`)).toBeVisible()

  await page.getByRole('button', { name: 'Показати' }).click()
  await expect(page).toHaveURL(new RegExp(`date=${today}`))
  await expect(page.locator(`[data-day="${today}"]`).getByRole('button', { name: /^Відкрити день/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  // the fact counts on the pay day, the plan day keeps a greyed entry with «Paid DD.MM»
  await expect(page.locator(`[data-day="${today}"]`)).toContainText('−350,00')
  await expect(planCell).toContainText(`Оплачено ${short(today)}`)

  // a phone opens the same entry as a bottom sheet from the day card under the grid
  await page.setViewportSize({
    width: 390,
    height: 844,
  })
  await page.goto(`/calendar?q=${mark}`)
  await page
    .getByRole('region', { name: /^Сьогодні/ })
    .getByRole('button', { name: new RegExp(mark) })
    .click()

  const sheet = page.getByRole('dialog', { name: mark })

  await expect(sheet).toContainText(`Оплачено ${short(today)} · план був на ${short(plan)}`)
  await expect(sheet.getByRole('button', { name: 'Відкрити операцію' })).toBeVisible()
})

test('«Змінити дату», а потім «Оплачено» без перезавантаження бере нову дату й оплачує', async ({ pageAs }) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`
  const today = kyivToday()
  // two days in the middle of this month: the date picker shows them once, and the move stays inside the month
  const fromDay = today.endsWith('-20') ? 22 : 20
  const toDay = fromDay + 1
  const moved = `${today.slice(0, 8)}${toDay}`

  await addPlannedPayment(page, mark, '250', fromDay)
  await page.goto(`/calendar?q=${mark}`)
  await page
    .locator(`[data-day="${today.slice(0, 8)}${fromDay}"]`)
    .getByRole('button', {
      name: mark,
      exact: true,
    })
    .click()
  await page.getByRole('dialog', { name: mark }).getByRole('button', { name: 'Змінити дату' }).click()

  const move = page.getByRole('dialog', { name: 'Змінити дату платежу' })

  await move.getByLabel('Нова дата').click()
  await page
    .getByRole('dialog')
    .getByRole('gridcell')
    .filter({ hasText: new RegExp(`^${toDay}$`) })
    .getByRole('button')
    .click()
  await move.getByRole('button', { name: 'Зберегти' }).click()
  await expect(move).toBeHidden()
  await expect(page.getByText('Дату змінено')).toBeVisible()

  // the pay sheet opens on the moved plan as it is now: its new date and its new version (QA 12.11: the old row
  // stayed in the sheet host, so «Paid» showed the old date and failed with PT409 until a reload)
  await page
    .locator(`[data-day="${moved}"]`)
    .getByRole('button', {
      name: mark,
      exact: true,
    })
    .click()
  await page
    .getByRole('dialog', { name: mark })
    .getByRole('button', {
      name: 'Оплачено',
      exact: true,
    })
    .click()

  const pay = page.getByRole('dialog', { name: `Оплатити ${mark}` })

  await expect(pay).toContainText(`Заплановано на ${short(moved)}`)
  await pay
    .getByRole('button', {
      name: 'Оплачено',
      exact: true,
    })
    .click()
  await expect(pay).toBeHidden()
  await expect(page.getByText(`Оплачено · записано на ${short(today)}`)).toBeVisible()
})
