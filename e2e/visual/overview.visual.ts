import { test } from '@playwright/test'
import { matchFrame, signInAsDemo } from './match-frame.fixture'

// Figma «Saldo», page 1:104, section 2:8236 (overview) and 2:11402 (operations): the loaded screens
const FRAMES = [
  {
    name: 'overview desktop',
    path: '/',
    frameId: '2:8237',
    width: 1440,
    height: 1669,
  },
  {
    name: 'overview mobile',
    path: '/',
    frameId: '2:8735',
    width: 390,
    height: 1977,
  },
  {
    name: 'operations desktop',
    path: '/operations',
    frameId: '2:11403',
    width: 1440,
    height: 2450,
  },
  {
    name: 'operations mobile',
    path: '/operations',
    frameId: '2:13681',
    width: 390,
    height: 3089,
  },
]

for (const frame of FRAMES) {
  test.describe(frame.name, () => {
    test.use({
      viewport: {
        width: frame.width,
        height: frame.height,
      },
    })

    test(`${frame.name} ${frame.frameId}`, async ({ page }) => {
      await signInAsDemo(page)
      await page.goto(frame.path)
      await matchFrame(page, frame)
    })
  })
}
