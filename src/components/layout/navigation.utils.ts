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

/** the longest href that contains pathname, so /operations/accounts/42 picks Рахунки, not Усі операції */
export function activeHref(pathname: string, links: readonly NavLink[]): string | null {
  let best: string | null = null
  for (const { href } of links) {
    if (matches(pathname, href) && (best === null || href.length > best.length)) best = href
  }
  return best
}

const ALL_SECTIONS: readonly NavSection[] = [...SIDEBAR_SECTIONS, SIDEBAR_FOOTER_SECTION]

/** Topbar title: the sub-item's label inside a section (Рахунки), the section's on its own first page (Огляд) */
export function pageTitle(pathname: string): string {
  const section = ALL_SECTIONS.find((s) => s.href === activeHref(pathname, ALL_SECTIONS))
  if (section) {
    const sub = section.children?.find((c) => c.href === activeHref(pathname, section.children ?? []))
    return sub && sub.href !== section.href ? sub.label : section.label
  }
  return EXTRA_TITLES.find((l) => l.href === activeHref(pathname, EXTRA_TITLES))?.label ?? 'Saldo'
}

/** «Ще» in the TabBar is active on its own page and on every section it lists */
export const isMoreActive = (pathname: string) => pathname === '/more' || activeHref(pathname, MORE_SECTIONS) !== null
