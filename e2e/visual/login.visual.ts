import { test } from '@playwright/test'
import { matchFrame } from './match-frame.fixture'

// Figma «Saldo», page 1:104, section 4:79953 (app states): the login form and its wrong-password state
test.describe('login desktop', () => {
  test.use({
    viewport: {
      width: 1440,
      height: 900,
    },
  })

  test('login 4:79954', async ({ page }) => {
    await page.goto('/login')
    await matchFrame(page, {
      frameId: '4:79954',
      width: 1440,
      height: 900,
    })
  })
})

test.describe('login mobile', () => {
  test.use({
    viewport: {
      width: 390,
      height: 844,
    },
  })

  test('login 4:79982', async ({ page }) => {
    await page.goto('/login')
    // the frame shows the form filled in
    await page.getByLabel('Email').fill('maksym@example.com')
    await page.getByLabel('Пароль').fill('123456789012')
    await matchFrame(page, {
      frameId: '4:79982',
      width: 390,
      height: 844,
    })
  })

  test('wrong password 4:80005', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('maksym@example.com')
    await page.getByLabel('Пароль').fill('12345678')
    await page.getByRole('button', { name: 'Увійти' }).click()
    await page.getByText('Невірний email або пароль').waitFor()
    await page.getByLabel('Пароль').blur()
    await matchFrame(page, {
      frameId: '4:80005',
      width: 390,
      height: 844,
    })
  })
})
