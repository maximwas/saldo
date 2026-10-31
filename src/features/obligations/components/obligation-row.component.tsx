import { Pencil } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'
import { Amount } from '@/components/ui/amount.component'
import { AuthorAvatar } from '@/components/ui/author-avatar.component'
import { Badge } from '@/components/ui/badge.component'
import { Button } from '@/components/ui/button.component'
import { CategoryBadge } from '@/components/ui/category-badge.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { useToday } from '@/contexts/clock.context'
import { useCanWrite, useLedgerStore } from '@/contexts/ledger.context'
import { useMemberNames } from '@/lib/members/member-names.hook'
import { cn } from '@/lib/utils/cn.utils'
import type { ObligationRow } from '../api/obligations.api'
import { useObligationOptions } from '../hooks/obligations.hook'

type ObligationRowItemProps = {
  obligation: ObligationRow
  /** «Paid» is in the device's queue, not on the server yet: Figma 5:88413 */
  awaitingSync: boolean
  onPay: () => void
  onEdit: () => void
  onCancelPayment: () => void
}

// StatusPill Kind per state: Plan, Partial, Unconfirmed, Paid
const STATE_TONE = {
  plan: 'plan',
  partial: 'info',
  unconfirmed: 'warning',
  paid: 'positive',
} as const

// Figma «Saldo» → Upcoming payments ListItem 2:12287 / 2:13332: Leading 40 (ServiceLogo, a letter tile, or the
// CategoryBadge of a big expense), title body-medium, «source · installment · account» + StatusPill, a plan Amount over
// the date on the right, desktop Secondary S «Paid» button; padding 12/0, gap 16. On mobile the row itself opens the
// confirm sheet and a credit drops the account from the subtitle.
// a search result links here: bring the row into view
const scrollIntoView = (node: HTMLLIElement | null) => node?.scrollIntoView({ block: 'center' })

export function ObligationRowItem({
  obligation,
  awaitingSync,
  onPay,
  onEdit,
  onCancelPayment,
}: ObligationRowItemProps) {
  const [linkedId] = useQueryState('obligation', parseAsString)
  const linked = linkedId === obligation.id
  const translate = useTranslations('obligations')
  const format = useFormatter()
  const names = useMemberNames()
  const timeZone = useLedgerStore((ledger) => ledger.timeZone)
  const canWrite = useCanWrite()
  const today = useToday()
  const options = useObligationOptions()
  const accountName = options.data?.accounts.find((account) => account.id === obligation.accountId)?.name ?? null
  const category = options.data?.categories.find((item) => item.id === obligation.categoryId)
  const confirmer = obligation.confirmedBy ? names[obligation.confirmedBy] : null
  const open = obligation.state !== 'paid' && !awaitingSync
  const hasPayments = obligation.paidMinor > 0
  const isCredit = obligation.sourceType === 'credit'
  const installment =
    isCredit && obligation.sequenceNo !== null
      ? translate(obligation.installmentTotal === null ? 'installmentNumber' : 'installment', {
          number: obligation.sequenceNo,
          total: obligation.installmentTotal ?? 0,
        })
      : null
  const dateLabel =
    obligation.dueOn === today
      ? translate('todayLabel')
      : format.dateTime(new Date(`${obligation.dueOn}T12:00:00Z`), {
          timeZone: 'UTC',
          day: '2-digit',
          month: '2-digit',
        })
  const pill = awaitingSync ? 'paid' : obligation.state
  const paidKind = open ? 'plan' : 'fact'
  const amountKind = obligation.direction === 'in' ? 'income' : paidKind

  return (
    <li
      ref={linked ? scrollIntoView : undefined}
      className={cn('flex flex-col', linked && 'rounded-inner ring-2 ring-primary ring-offset-4 ring-offset-card')}
    >
      <div className="flex items-center gap-4 py-3">
        <button
          type="button"
          disabled={!canWrite || !open}
          onClick={onPay}
          className="flex min-w-0 flex-1 items-center gap-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default"
        >
          {obligation.sourceType === 'big_expense' ? (
            <CategoryBadge icon={category?.icon ?? null} color={category?.color ?? null} />
          ) : (
            <ServiceLogo name={obligation.title} />
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-body font-medium text-text-primary">{obligation.title}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-label text-text-secondary">
                {translate(`kind.${obligation.sourceType as 'manual'}`)}
                {installment ? ` · ${installment}` : ''}
                {accountName ? <span className={cn(isCredit && 'max-lg:hidden')}>{` · ${accountName}`}</span> : null}
                {awaitingSync ? ` · ${translate('awaitingSync')}` : ''}
              </span>
              <Badge tone={STATE_TONE[pill]}>{translate(`state.${pill}`)}</Badge>
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-0.5">
            <Amount
              minor={
                open
                  ? (obligation.remainingMinor ?? obligation.plannedMinor)
                  : obligation.paidMinor || obligation.plannedMinor
              }
              currency={obligation.currency}
              kind={amountKind}
            />
            <span className="text-label text-text-secondary">{dateLabel}</span>
          </span>
        </button>
        {canWrite && open && (
          <Button size="s" variant="secondary" className="hidden lg:inline-flex" onClick={onPay}>
            {translate(obligation.sourceType === 'debt' ? 'actions.toDebt' : 'actions.paid')}
          </Button>
        )}
      </div>
      {obligation.state === 'paid' && confirmer && obligation.confirmedAt ? (
        <span className="flex items-center gap-1.5 pb-3 pl-14 text-caption text-text-secondary">
          <AuthorAvatar name={confirmer} />
          {translate('confirmedBy', {
            name: confirmer,
            date: format.dateTime(new Date(obligation.confirmedAt), {
              day: '2-digit',
              month: '2-digit',
              timeZone,
            }),
          })}
        </span>
      ) : null}
      {canWrite && !awaitingSync && (hasPayments || (obligation.sourceType === 'manual' && open)) && (
        <div className="flex gap-2 pb-3 pl-14">
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
