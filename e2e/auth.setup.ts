import { expect, test as setup } from '@playwright/test'
import { authStatePath, E2E_PASSWORD, emailOf, ROLES } from './fixtures/users.fixture'

// a real UI login per role, so the @supabase/ssr cookies in the saved state are genuine
for (const role of ROLES) {
  setup(`log in as ${role}`, async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(emailOf(role))
    await page.getByLabel('Пароль').fill(E2E_PASSWORD)
    await page.getByRole('button', { name: 'Увійти' }).click()
    await expect(page).toHaveURL('/')
    await page.context().storageState({ path: authStatePath(role) })
  })
}
