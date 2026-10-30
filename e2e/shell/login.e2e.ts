import { expect, type Page, test } from '@playwright/test'
import { E2E_PASSWORD, emailOf } from '../fixtures/users.fixture'

async function logIn(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Пароль').fill(password)
  await page.getByRole('button', { name: 'Увійти' }).click()
}

test('owner logs in and lands on the overview @mobile', async ({ page }) => {
  await logIn(page, emailOf('owner'), E2E_PASSWORD)

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Огляд' })).toBeVisible()
})

test('stranger with a wrong password stays on the login page', async ({ page }) => {
  await logIn(page, emailOf('stranger'), `${E2E_PASSWORD}-wrong`)

  await expect(page.getByText('Невірний email або пароль')).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('an unknown email does not log in', async ({ page }) => {
  await logIn(page, 'nobody@example.com', E2E_PASSWORD)

  await expect(page.getByText('Невірний email або пароль')).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('without a session the app redirects to the login page @mobile', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('button', { name: 'Увійти' })).toBeVisible()
})
