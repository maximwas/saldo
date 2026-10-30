import { Pencil } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { Button } from '@/components/ui/button.component'
import type { ObligationRow } from '../api/obligations.api'

type ObligationRowItemProps = {
  obligation: ObligationRow
  today: string
  accountName: string | null
  canWrite: boolean
  onPay: () => void
  onEdit: () => void
  onCancelPayment: () => void
}

const STATE_TONE = {
  plan: 'plan',
  partial: 'info',
  unconfirmed: 'warning',
  paid: 'positive',
} as const

// Figma «Saldo» → Upcoming payments 2:12142 / 2:13276: title, «source · account» + state pill, amount and date on the
// right, desktop Paid button; on mobile the row itself opens the confirm sheet (no room for the button).
export function ObligationRowItem({
  obligation,
  today,
  accountName,
  canWrite,
  onPay,
  onEdit,
  onCancelPayment,
}: ObligationRowItemProps) {
  const translate = useTranslations('obligations')
  const format = useFormatter()
  const open = obligation.state !== 'paid'
  const hasPayments = obligation.paidMinor > 0
  const dateLabel =
    obligation.dueOn === today
      ? translate('todayLabel')
      : format.dateTime(new Date(`${obligation.dueOn}T12:00:00Z`), {
          timeZone: 'UTC',
          day: '2-digit',
          month: '2-digit',
        })

  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          disabled={!canWrite || !open}
          onClick={onPay}
          className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default"
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-body font-medium text-text-primary">{obligation.title}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-secondary">
              <span>
                {translate(`source.${obligation.sourceType as 'manual'}`)}
                {accountName ? ` · ${accountName}` : ''}
              </span>
              <Badge tone={STATE_TONE[obligation.state]}>{translate(`state.${obligation.state}`)}</Badge>
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <Amount
              minor={open ? (obligation.remainingMinor ?? obligation.plannedMinor) : obligation.paidMinor}
              currency={obligation.currency}
              kind={obligation.direction === 'in' ? 'income' : 'fact'}
            />
            <span className="text-caption text-text-secondary">{dateLabel}</span>
          </span>
        </button>
        {canWrite && open && (
          <Button size="s" variant="secondary" className="hidden lg:inline-flex" onClick={onPay}>
            {translate('actions.paid')}
          </Button>
        )}
      </div>
      {canWrite && (hasPayments || obligation.sourceType === 'manual') && (
        <div className="flex gap-2">
          {obligation.sourceType === 'manual' && open && (
            <Button size="s" variant="ghost" onClick={onEdit}>
              <Pencil aria-hidden size={16} />
              {translate('actions.edit')}
            </Button>
          )}
          {hasPayments && (
            <Button size="s" variant="ghost" onClick={onCancelPayment}>
              {translate('actions.cancelPayment')}
            </Button>
          )}
        </div>
      )}
    </li>
  )
}
