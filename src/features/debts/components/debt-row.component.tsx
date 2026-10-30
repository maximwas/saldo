import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { Button } from '@/components/ui/button.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { formatMinor } from '@/lib/money/money.utils'
import type { DebtRow } from '../api/debts.api'
import { type DebtState, debtState } from '../utils/debt-groups.utils'

export type DebtAction = 'repay' | 'close' | 'writeOff' | 'edit'

type DebtRowItemProps = {
  debt: DebtRow
  onAction: (action: DebtAction) => void
}

const STATE_TONE = {
  open: 'plan',
  partial: 'info',
  returned: 'positive',
  settled: 'positive',
  written_off: 'muted',
} as const satisfies Record<DebtState, string>

// Figma «Saldo» → Personal debts, Desktop 2:61492: avatar-less row on the card: person, reason + state pill, the
// return line, remaining on the right (closed and written-off debts keep the figure in transfer grey), actions below.
export function DebtRowItem({ debt, onAction }: DebtRowItemProps) {
  const translate = useTranslations('debts')
  const format = useFormatter()
  const locale = useLocale()
  const canWrite = useCanWrite()
  const state = debtState(debt)
  const closed = debt.status !== 'open'
  const dueLabel = debt.dueOn
    ? translate('row.due', {
        date: format.dateTime(new Date(`${debt.dueOn}T12:00:00Z`), {
          timeZone: 'UTC',
          day: '2-digit',
          month: '2-digit',
        }),
      })
    : translate('row.noDue')

  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-body font-medium text-text-primary">{debt.person}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-secondary">
            <span>{debt.reason ?? (debt.origin === 'purchase_share' ? translate('row.share') : '—')}</span>
            <Badge tone={STATE_TONE[state]}>{translate(`state.${state}`)}</Badge>
          </span>
          <span className="text-caption text-text-secondary">
            {state === 'partial' || state === 'returned'
              ? translate('row.repaid', {
                  repaid: formatMinor(debt.repaidMinor, debt.currency, locale),
                  principal: formatMinor(debt.principalMinor, debt.currency, locale),
                })
              : dueLabel}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Amount minor={debt.remainingMinor} currency={debt.currency} kind={closed ? 'transfer' : 'fact'} />
          <span className="text-caption text-text-secondary">{translate('row.remaining')}</span>
          {debt.overpaidMinor > 0 && (
            <span className="text-caption text-text-secondary">
              {translate('row.overpaid', {
                amount: formatMinor(debt.overpaidMinor, debt.currency, locale),
              })}
            </span>
          )}
        </span>
      </div>
      {canWrite && !closed && (
        <div className="flex flex-wrap gap-2">
          {debt.remainingMinor > 0 && (
            <Button size="s" variant="secondary" onClick={() => onAction('repay')}>
              {translate('actions.repay')}
            </Button>
          )}
          <Button size="s" variant="ghost" onClick={() => onAction('close')}>
            {translate('actions.close')}
          </Button>
          {debt.remainingMinor > 0 && (
            <Button size="s" variant="ghost" onClick={() => onAction('writeOff')}>
              {translate('actions.writeOff')}
            </Button>
          )}
          <Button size="s" variant="ghost" onClick={() => onAction('edit')}>
            {translate('actions.edit')}
          </Button>
        </div>
      )}
    </li>
  )
}
