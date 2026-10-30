import { type BrowserContext, test as base, type Page } from '@playwright/test'
import { authStatePath, type Role } from './users.fixture'

export const test = base.extend<{ pageAs: (role: Role) => Promise<Page> }>({
  // a manual context does not inherit `use` from the config, so the project's device and locale are passed explicitly
  pageAs: async (
    { browser, baseURL, locale, timezoneId, viewport, userAgent, deviceScaleFactor, isMobile, hasTouch },
    use,
  ) => {
    const opened: BrowserContext[] = []

    await use(async (role) => {
      const context = await browser.newContext({
        baseURL,
        locale,
        timezoneId,
        viewport,
        userAgent,
        deviceScaleFactor,
        isMobile,
        hasTouch,
        storageState: authStatePath(role),
      })

      opened.push(context)

      return context.newPage()
    })
    await Promise.all(opened.map((context) => context.close()))
  },
})
