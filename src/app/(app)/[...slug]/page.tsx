import { ChevronLeft } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import { pageTitleKey, soonSection } from '@/components/layout/navigation.utils'
import { Button } from '@/components/ui/button.component'
import { EXTRA_TITLES, SIDEBAR_FOOTER_SECTION, SIDEBAR_SECTIONS } from '@/constants/navigation.constants'

// shortcut: one catch-all stub for every §2 page; each feature adds its own page.tsx and leaves this list
const OWN_PAGES = [
  '/',
  '/space',
  '/settings',
  '/notifications',
  '/payments',
  '/payments/credits',
  '/operations',
  '/operations/accounts',
  '/operations/categories',
  '/payments/debts',
  '/payments/subscriptions',
  '/statistics',
  '/calendar',
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

// a section that is not built yet says so: what it will hold, that nothing can be added yet, and the way back
async function Stub({ params }: Pick<PageProps<'/[...slug]'>, 'params'>) {
  const { slug } = await params
  const path = `/${slug.join('/')}`
  const titleKey = pageTitleKey(path)
  const section = soonSection(path)

  if (!titleKey || !section || !STUB_HREFS.some((href) => href === path)) {
    notFound()
  }

  const [translate, translateNav] = await Promise.all([getTranslations('shell'), getTranslations('nav')])
  const backKey = pageTitleKey(section.backHref)

  return (
    <section className="flex max-w-xl flex-col items-start gap-3 rounded-card bg-card p-5 shadow-card lg:p-6">
      <h2 className="text-card-title text-text-primary">
        {translate('soon.title', { title: translateNav(section.key) })}
      </h2>
      <p className="text-body text-text-primary">{translate(`soon.sections.${section.key}`)}</p>
      <p className="text-label text-text-secondary">{translate('soon.note')}</p>
      <Button variant="secondary" render={<Link href={section.backHref as Route} />} nativeButton={false}>
        <ChevronLeft aria-hidden className="size-4" />
        {translate('soon.back', { title: backKey ? translateNav(backKey) : translateNav('overview') })}
      </Button>
    </section>
  )
}
