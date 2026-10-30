import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { pageTitle } from '@/components/layout/navigation.utils'
import { EXTRA_TITLES, SIDEBAR_FOOTER_SECTION, SIDEBAR_SECTIONS } from '@/constants/navigation.constants'
import { SHELL_TEXT } from '@/constants/shell.constants'

// shortcut: one catch-all stub for every §2 page; each feature adds its own page.tsx (a static route wins over this)
const STUB_HREFS = [
  ...[...SIDEBAR_SECTIONS, SIDEBAR_FOOTER_SECTION].flatMap((section) => [
    section.href,
    ...(section.children ?? []).map((child) => child.href),
  ]),
  ...EXTRA_TITLES.map((extra) => extra.href),
].filter((href, index, hrefs) => href !== '/more' && hrefs.indexOf(href) === index)

export function generateStaticParams() {
  return STUB_HREFS.map((href) => ({ slug: href === '/' ? [] : href.slice(1).split('/') }))
}

// params are URL data: read inside <Suspense> so the shell stays instant (cacheComponents)
export default function StubPage({ params }: PageProps<'/[[...slug]]'>) {
  return (
    <Suspense>
      <Stub params={params} />
    </Suspense>
  )
}

async function Stub({ params }: Pick<PageProps<'/[[...slug]]'>, 'params'>) {
  const { slug } = await params
  const path = `/${(slug ?? []).join('/')}`

  if (!STUB_HREFS.some((href) => href === path)) {
    notFound()
  }

  return <p className="text-body text-text-secondary">{SHELL_TEXT.stub(pageTitle(path))}</p>
}
