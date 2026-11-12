import { expect, type Page } from '@playwright/test'
import { DEMO } from '../fixtures/demo-data.fixture'
import { test } from '../fixtures/roles.fixture'

// conventions §4.6c: in a row whose text runs 2+ lines, the icon or tile stands on the first line, never on the
// centre. From the row's title up to the first box that holds a square 32–48 tile before it: how far the tile's top is
// from the title's top, and how tall the row's text runs from the title down (one line would prove nothing)
function measure(page: Page, label: string) {
  return page.evaluate((text) => {
    const title = [...document.body.querySelectorAll('*')].find(
      (node) =>
        node.children.length === 0 && node.textContent?.trim() === text && node.getBoundingClientRect().height > 0,
    )

    if (!title) {
      return null
    }

    for (let box = title.parentElement; box; box = box.parentElement) {
      const tile = [...box.querySelectorAll('*')].find((node) => {
        const rect = node.getBoundingClientRect()

        return (
          rect.width >= 32 &&
          rect.width <= 48 &&
          Math.abs(rect.width - rect.height) < 0.5 &&
          (node.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
        )
      })

      if (tile) {
        const titleTop = title.getBoundingClientRect().top
        const textBottom = Math.max(
          ...[...box.querySelectorAll('*')]
            .filter((node) => node.children.length === 0 && node.textContent?.trim())
            .map((node) => node.getBoundingClientRect().bottom),
        )

        return {
          gap: Math.abs(tile.getBoundingClientRect().top - titleTop),
          textHeight: textBottom - titleTop,
        }
      }
    }

    return null
  }, label)
}

const ROWS = [
  {
    path: '/operations/categories',
    title: 'Продукти',
  },
  {
    path: '/operations/accounts',
    title: DEMO.cardName,
  },
  {
    path: '/',
    title: DEMO.cardName,
  },
]

for (const { path, title } of ROWS) {
  test(`${path}: the icon of «${title}» stands on its first text line @mobile`, async ({ pageAs }) => {
    const page = await pageAs('owner')

    await page.setViewportSize({
      width: 390,
      height: 844,
    })
    await page.goto(path)
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible()

    const row = await measure(page, title)

    expect(row).not.toBeNull()
    // the title and the line under it: a one-line row would pass anyhow
    expect(row?.textHeight ?? 0).toBeGreaterThan(36)
    expect(row?.gap ?? Number.NaN).toBeLessThanOrEqual(2)
  })
}
