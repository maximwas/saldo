import { expect } from '@playwright/test'
import { addPlannedPayment, shortDay as short } from '../fixtures/planned-payment.fixture'
import { test } from '../fixtures/roles.fixture'
import { kyivToday } from '../fixtures/subscriptions.fixture'

test('план, оплачений в інший тиждень, лишає позначку в дні й тижні плану; порожній день і легенда телефона', async ({
  pageAs,
}) => {
  const page = await pageAs('owner')
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`
  const today = kyivToday()
  // at least 11 days from today, so the plan's week and day never read the payment of today
  const planDay = Number(today.slice(8)) <= 14 ? 25 : 3
  const plan = `${today.slice(0, 8)}${String(planDay).padStart(2, '0')}`
  const emptyDay = `${today.slice(0, 8)}${String(planDay + 1).padStart(2, '0')}`

  await addPlannedPayment(page, mark, '350', planDay)

  // pay it today from the plan's own day
  await page.goto(`/calendar?view=day&date=${plan}&q=${mark}`)

  const dayCard = page.getByRole('region', { name: new RegExp(`\\b${planDay} `) })

  await dayCard.getByRole('button', { name: new RegExp(mark) }).click()
  await page
    .getByRole('dialog', { name: mark })
    .getByRole('button', {
      name: 'Оплатити',
      exact: true,
    })
    .click()

  const pay = page.getByRole('dialog', { name: `Оплатити ${mark}` })

  await pay
    .getByRole('button', {
      name: 'Оплачено',
      exact: true,
    })
    .click()
  await expect(pay).toBeHidden()

  // the day view reads only the plan's day, yet it keeps the payment made on another day
  await expect(dayCard).toContainText('Оплачено в інший день')
  await expect(dayCard).toContainText(mark)
  await expect(dayCard).toContainText('оплачено сьогодні')

  // the week of the plan has no payment in it, yet its tile shows the greyed entry and «Paid DD.MM»
  await page.goto(`/calendar?view=week&date=${plan}&q=${mark}`)

  const tile = page.locator(`[data-day="${plan}"]`)

  await expect(tile).toContainText(mark)
  await expect(tile).toContainText(`Оплачено ${short(today)}`)
  // a day of the desktop week opens the day view
  await tile.getByRole('button', { name: /^Відкрити день/ }).click()
  await expect(page).toHaveURL(/view=day/)

  // a day without entries says so and offers a quiet add
  await page.goto(`/calendar?view=day&date=${emptyDay}&q=${mark}`)
  await expect(page.getByText('Операцій цього дня ще немає')).toBeVisible()
  await expect(page.getByRole('button', { name: `Додати запис на ${short(emptyDay)}` })).toBeVisible()

  // phones explain the marks under the month grid in words
  await page.setViewportSize({
    width: 390,
    height: 844,
  })
  await page.goto(`/calendar?q=${mark}`)
  await expect(page.getByText('оплачено раніше, в інший день')).toBeVisible()
  await expect(page.getByText('оплачено', { exact: true })).toBeVisible()
})
