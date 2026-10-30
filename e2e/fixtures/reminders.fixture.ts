import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database.types'

export const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SECRET_KEY ?? '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
)

/**
 * A monthly subscription due today whose reminder is «on the due day at 00:00»: the cron fires it at any time of the
 * day, so a test does not depend on the clock (the defaults, 3 and 2 days before, never fall in the cron's window).
 */
export async function addReminderSubscription(page: Page, name: string) {
  await page.goto('/payments/subscriptions')
  await page.getByRole('button', { name: 'Додати підписку' }).first().click()

  const form = page.getByRole('dialog')

  await form.getByLabel('Назва').fill(name)
  await form.getByLabel('Сума за період').fill('99')
  await form.getByRole('button', { name: 'Зберегти' }).click()
  await expect(form).toBeHidden()

  const { data: subscription } = await admin.from('subscriptions').select('id').eq('name', name).single()
  const { error } = await admin
    .from('reminder_rules')
    .update({
      offsets_days: [0],
      at_time: '00:00',
    })
    .eq('source_type', 'subscription')
    .eq('source_id', subscription?.id ?? '')

  expect(error).toBeNull()
}

export async function callRemindersCron(page: Page) {
  const response = await page.request.post('/api/cron/reminders', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })

  expect(response.ok()).toBe(true)
}
