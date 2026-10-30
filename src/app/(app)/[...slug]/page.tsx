import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import { pageTitleKey } from '@/components/layout/navigation.utils'
import { EXTRA_TITLES, SIDEBAR_FOOTER_SECTION, SIDEBAR_SECTIONS } from '@/constants/navigation.constants'

// shortcut: one catch-all stub for every §2 page; each feature adds its own page.tsx and leaves this list
const OWN_PAGES = [
  '/',
  '/space',
  '/settings',
  '/payments',
  '/payments/credits',
  '/operations',
  '/operations/accounts',
  '/operations/categories',
  '/payments/debts',
  '/payments/subscriptions',
]

const STUB_HREFS = [
  ...[...SIDEBAR_SECTIONS, SIDEBAR_FOOTER_SECTION].flatMap((section) => [
    section.href,
    ...(section.children ?? []).map((child) => child.href),
  ]),
  ...EXTRA_TITLES.map((extra) => extra.href),
].filter((href, index, hrefs) => !OWN_PAGES.includes(href) && hrefs.indexOf(href) === index)

export function generateStaticParams() {
  return STUB_HREFS.map((href) => ({ slug: href.slice(1).split('/') }))
}

// params are URL data: read inside <Suspense> so the shell stays instant (cacheComponents)
export default function StubPage({ params }: PageProps<'/[...slug]'>) {
  return (
    <Suspense>
      <Stub params={params} />
    </Suspense>
  )
}

async function Stub({ params }: Pick<PageProps<'/[...slug]'>, 'params'>) {
  const { slug } = await params
  const path = `/${slug.join('/')}`
  const titleKey = pageTitleKey(path)

  if (!titleKey || !STUB_HREFS.some((href) => href === path)) {
    notFound()
  }

  const [translate, translateNav] = await Promise.all([getTranslations('shell'), getTranslations('nav')])

  return <p className="text-body text-text-secondary">{translate('stub', { title: translateNav(titleKey) })}</p>
}
