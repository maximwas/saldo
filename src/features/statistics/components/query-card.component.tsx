'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import type { CardStatus } from '../utils/statistics.utils'

type QueryCardProps = {
  title: string
  /** «To operations ›»: label and href of the link in the header */
  action?: {
    label: string
    href: string
  }
  status: CardStatus
  emptyText: string
  retryAction: () => void
  children: React.ReactNode
}

// Figma «Saldo» → Statistics 4:79708 (loading: subtle blocks), 4:79761 (error / offline), 4:79641 (empty): the card
// keeps its title and says what is wrong in its own place, so one failed query never blanks the screen.
export function QueryCard({ title, action, status, emptyText, retryAction, children }: QueryCardProps) {
  const translate = useTranslations('statistics')
  const common = useTranslations('common')

  return (
    <Card title={title} action={action}>
      {status === 'pending' && <div aria-busy className="h-40 animate-pulse rounded-inner bg-subtle" />}
      {status === 'offline' && <p className="text-body text-text-secondary">{translate('state.offline')}</p>}
      {status === 'error' && (
        <div role="alert" className="flex flex-wrap items-center gap-3">
          <p className="text-body text-negative-text">{translate('state.error')}</p>
          <Button variant="secondary" size="s" onClick={retryAction}>
            {common('toast.retry')}
          </Button>
        </div>
      )}
      {status === 'empty' && <p className="text-body text-text-secondary">{emptyText}</p>}
      {status === 'ready' && children}
    </Card>
  )
}
