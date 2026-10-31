'use client'

import { Plus } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { CategoryIcon } from '@/components/ui/category-icon.component'
import { useCanWrite } from '@/contexts/ledger.context'

// Figma «Saldo» → Overview · First run 5:87358 (Welcome 5:87871) / 5:87894 (5:88372): one card in place of the rest,
// EmptyState (blue wallet 40, body-semibold title, label text), then «Add account» (primary, plus) and «Add operation»
// (secondary): side by side on desktop, stacked on mobile; a viewer sees the text only
export function OverviewWelcome() {
  const translate = useTranslations('overview.welcome')
  const canWrite = useCanWrite()

  return (
    <section className="flex flex-col items-center gap-5 rounded-card bg-card px-4 py-10 shadow-card lg:px-8 lg:py-16">
      <div className="flex flex-col items-center gap-3 p-2 text-center lg:w-120">
        <CategoryIcon icon="wallet" color="blue" />
        <h2 className="self-stretch text-body font-semibold text-text-primary">{translate('title')}</h2>
        <p className="self-stretch text-label text-text-secondary">{translate('text')}</p>
      </div>
      {canWrite ? (
        <div className="flex flex-col gap-3 self-stretch lg:flex-row lg:self-center">
          <Button render={<Link href={'/operations/accounts' as Route} />}>
            <Plus aria-hidden size={20} />
            {translate('addAccount')}
          </Button>
          <Button variant="secondary" render={<Link href={'?add=expense' as Route} scroll={false} />}>
            {translate('addOperation')}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
