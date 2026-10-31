import { expect, type Page } from '@playwright/test'

type Frame = {
  /** Figma node id, e.g. «2:16567»; its PNG is e2e/visual/figma/2-16567.png */
  frameId: string
  width: number
  height: number
}

/** the moment the Figma frames show: Friday, 30 October 2026, 18:40 in Kyiv (the new-operation time field) */
const FIGMA_NOW = new Date('2026-10-30T18:40:00+02:00')

/** demo@example.com of supabase/seed.sql + scripts/seed-visual.mjs, through the real login form */
export async function signInAsDemo(page: Page) {
  await page.clock.setFixedTime(FIGMA_NOW)
  await page.goto('/login')
  await page.getByLabel('Email').fill('demo@example.com')
  await page.getByLabel('Пароль').fill('saldo-demo-local-password')
  await page.getByRole('button', { name: 'Увійти' }).click()
  await expect(page).toHaveURL('/')
}

/** the viewport against the Figma frame exported at scale 1; a frame without its PNG fails (no --update-snapshots) */
export async function matchFrame(page: Page, { frameId, width, height }: Frame) {
  await page.setViewportSize({
    width,
    height,
  })
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await expect(page).toHaveScreenshot(`${frameId.replace(':', '-')}.png`)
}

/**
 * a desktop dialog frame: Figma puts the Dialog where it fits the frame (2:16567 y 48, 2:17848 y 24) while the app
 * centres it, so only the dialog's box is compared, against `<frameId>-dialog.png` = the frame exported with the
 * Dialog's box as the clip (Pixelwright `screenshot` clip, scale 1); an open menu over the dialog is in both
 */
export async function matchDialog(page: Page, { frameId, width, height }: Frame) {
  await page.setViewportSize({
    width,
    height,
  })
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)

  const box = await page.getByRole('dialog').boundingBox()

  if (!box) {
    throw new Error(`${frameId}: no dialog on the page`)
  }

  await expect(page).toHaveScreenshot(`${frameId.replace(':', '-')}-dialog.png`, { clip: box })
}
