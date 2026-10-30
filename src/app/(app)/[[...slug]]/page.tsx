import { notFound } from 'next/navigation'
import { pageTitle } from '@/components/layout/navigation.utils'
import { EXTRA_TITLES, SIDEBAR_FOOTER_SECTION, SIDEBAR_SECTIONS } from '@/constants/navigation.constants'
import { SHELL_TEXT } from '@/constants/shell.constants'

// shortcut: one catch-all stub for every §2 page; each feature adds its own page.tsx (a static route wins over this)
const STUB_HREFS = [
  ...[...SIDEBAR_SECTIONS, SIDEBAR_FOOTER_SECTION].flatMap((s) => [s.href, ...(s.children ?? []).map((c) => c.href)]),
  ...EXTRA_TITLES.map((l) => l.href),
].filter((href, i, all) => href !== '/more' && all.indexOf(href) === i)

export function generateStaticParams() {
  return STUB_HREFS.map((href) => ({ slug: href === '/' ? [] : href.slice(1).split('/') }))
}

export default async function StubPage({ params }: PageProps<'/[[...slug]]'>) {
  const { slug } = await params
  const path = `/${(slug ?? []).join('/')}`
  if (!STUB_HREFS.some((href) => href === path)) notFound()
  return <p className="text-body text-text-secondary">{SHELL_TEXT.stub(pageTitle(path))}</p>
}
