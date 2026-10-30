import {
  EXTRA_TITLES,
  MORE_SECTIONS,
  type NavLink,
  type NavSection,
  SIDEBAR_FOOTER_SECTION,
  SIDEBAR_SECTIONS,
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

/** Topbar title: the sub-item's label deeper in a section, the section's own on its first page */
export function pageTitle(pathname: string): string {
  const section = ALL_SECTIONS.find((candidate) => candidate.href === activeHref(pathname, ALL_SECTIONS))

  if (section) {
    const subItem = section.children?.find((child) => child.href === activeHref(pathname, section.children ?? []))

    return subItem && subItem.href !== section.href ? subItem.label : section.label
  }

  return EXTRA_TITLES.find((extra) => extra.href === activeHref(pathname, EXTRA_TITLES))?.label ?? 'Saldo'
}

/** More in the TabBar is active on its own page and on every section it lists */
export const isMoreActive = (pathname: string) => pathname === '/more' || activeHref(pathname, MORE_SECTIONS) !== null
