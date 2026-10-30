import {
  EXTRA_TITLES,
  type NavKey,
  type NavLink,
  type NavSection,
  SIDEBAR_FOOTER_SECTION,
  SIDEBAR_SECTIONS,
  SPACE_SECTIONS,
} from '@/constants/navigation.constants'

const matches = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

/** the longest href that contains pathname, so /operations/accounts/42 picks accounts, not all operations */
export function activeHref(pathname: string, links: readonly NavLink[]): string | null {
  let best: string | null = null

  for (const { href } of links) {
    if (matches(pathname, href) && (best === null || href.length > best.length)) {
      best = href
    }
  }

  return best
}

const ALL_SECTIONS: readonly NavSection[] = [...SIDEBAR_SECTIONS, SIDEBAR_FOOTER_SECTION]

/** Topbar title key: the sub-item's deeper in a section, the section's own on its first page; null = the brand */
export function pageTitleKey(pathname: string): NavKey | null {
  const section = ALL_SECTIONS.find((candidate) => candidate.href === activeHref(pathname, ALL_SECTIONS))

  if (section) {
    const subItem = section.children?.find((child) => child.href === activeHref(pathname, section.children ?? []))

    return subItem && subItem.href !== section.href ? subItem.key : section.key
  }

  return EXTRA_TITLES.find((extra) => extra.href === activeHref(pathname, EXTRA_TITLES))?.key ?? null
}

/** Space in the TabBar is active on its own page and on every section the TabBar has no room for */
export const isSpaceActive = (pathname: string) =>
  pathname === '/space' || activeHref(pathname, SPACE_SECTIONS) !== null
