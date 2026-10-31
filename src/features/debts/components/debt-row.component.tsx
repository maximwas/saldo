import { CircleCheck, HandCoins, Pencil, ReceiptText } from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'
import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { Button } from '@/components/ui/button.component'
import { Menu, type MenuItem } from '@/components/ui/menu.component'
import { LetterAvatar } from '@/components/ui/service-logo.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { formatMinor } from '@/lib/money/money.utils'
import { cn } from '@/lib/utils/cn.utils'
import type { DebtRow } from '../api/debts.api'
import { type DebtState, debtState } from '../utils/debt-groups.utils'

export type DebtAction = 'repay' | 'close' | 'writeOff' | 'edit'

type DebtRowItemProps = {
  debt: DebtRow
  onActionAction: (action: DebtAction) => void
}

const STATE_TONE = {
  open: 'plan',
  partial: 'info',
  returned: 'positive',
  settled: 'positive',
  written_off: 'muted',
} as const satisfies Record<DebtState, string>

// a search result links here: bring the row into view
const scrollIntoView = (node: HTMLLIElement | null) => node?.scrollIntoView({ block: 'center' })

// Figma «Saldo» → Personal debts, Desktop rows 2:61548: avatar 40, person (body-medium), «reason date · due» + the state
// pill, a caption line («repaid X of Y · date», or «no repayments yet»), the sum on the right with «balance» under it
// (closed and written-off ones in transfer grey with «repaid» / «written off») and «Repay». Mobile 2:61784 keeps the
// first line and the pill, a closed row only the pill. The «···» menu is not drawn in Figma: it reaches edit, close and
// write off (and repay on mobile, where the button is not shown).
export function DebtRowItem({ debt, onActionAction }: DebtRowItemProps) {
  const [linkedId] = useQueryState('id', parseAsString)
  const linked = linkedId === debt.id
  const translate = useTranslations('debts')
  const format = useFormatter()
  const locale = useLocale()
  const canWrite = useCanWrite()
  const state = debtState(debt)
  const closed = debt.status !== 'open'
  const owedToMe = debt.direction === 'owed_to_me'
  const day = (iso: string) =>
    format.dateTime(new Date(`${iso}T12:00:00Z`), {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
    })
  const reason = debt.reason ?? (debt.origin === 'purchase_share' ? translate('row.share') : null)
  const lead = reason
    ? translate('row.dated', {
        reason,
        date: day(debt.arisenOn),
      })
    : day(debt.arisenOn)
  const tail = {
    open: debt.dueOn ? translate('row.dueShort', { date: day(debt.dueOn) }) : translate('row.noDue'),
    returned: debt.dueOn ? translate('row.dueShort', { date: day(debt.dueOn) }) : null,
    settled: translate('row.closedOn', { date: day(debt.closedOn) }),
    written_off: translate('row.writtenOffOn', { date: day(debt.closedOn) }),
  }
  const firstLine = [lead, closed ? tail[debt.status] : tail.open].filter(Boolean).join(' · ')
  const repaidLine =
    state === 'partial' && debt.lastRepaymentOn
      ? translate('row.repaidLine', {
          repaid: formatMinor(debt.repaidMinor, debt.currency, locale),
          principal: formatMinor(debt.principalMinor, debt.currency, locale),
          date: day(debt.lastRepaymentOn),
        })
      : null
  const noRepayments = state === 'open' ? translate(owedToMe ? 'row.noneOwedToMe' : 'row.noneIOwe') : null
  const secondLine = repaidLine ?? noRepayments
  const canRepay = canWrite && !closed && debt.remainingMinor > 0
  const items: MenuItem[] = [
    ...(canRepay
      ? [
          {
            label: translate('actions.repay'),
            onSelect: () => onActionAction('repay'),
            Icon: HandCoins,
          },
        ]
      : []),
    {
      label: translate('actions.edit'),
      onSelect: () => onActionAction('edit'),
      Icon: Pencil,
    },
    {
      label: translate('actions.close'),
      onSelect: () => onActionAction('close'),
      Icon: CircleCheck,
    },
    ...(debt.remainingMinor > 0
      ? [
          {
            label: translate('actions.writeOff'),
            onSelect: () => onActionAction('writeOff'),
            Icon: ReceiptText,
          },
        ]
      : []),
  ]

  return (
    <li
      ref={linked ? scrollIntoView : undefined}
      className={cn(
        'flex items-center gap-4 border-b border-border py-4 last:border-b-0',
        linked && 'rounded-inner ring-2 ring-primary ring-offset-4 ring-offset-card',
      )}
    >
      <LetterAvatar name={debt.person} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body font-medium text-text-primary">{debt.person}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label text-text-secondary">
          <span className={cn(closed && 'max-lg:hidden')}>{firstLine}</span>
          <Badge tone={STATE_TONE[state]}>{translate(`state.${state}`)}</Badge>
        </span>
        {secondLine && <span className="text-caption text-text-secondary max-lg:hidden">{secondLine}</span>}
        {debt.overpaidMinor > 0 && (
          <span className="text-caption text-text-secondary">
            {translate('row.overpaid', { amount: formatMinor(debt.overpaidMinor, debt.currency, locale) })}
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <Amount
          minor={closed || debt.remainingMinor === 0 ? debt.principalMinor : debt.remainingMinor}
          currency={debt.currency}
          kind={closed || debt.remainingMinor === 0 ? 'transfer' : 'fact'}
        />
        <span className="text-caption text-text-secondary max-lg:hidden">
          {closed || debt.remainingMinor === 0
            ? translate(debt.status === 'written_off' ? 'row.writtenOffLabel' : 'row.returnedLabel')
            : translate('row.balance')}
        </span>
      </div>
      {canRepay && (
        <Button size="s" variant="secondary" className="max-lg:hidden" onClick={() => onActionAction('repay')}>
          {translate(owedToMe ? 'actions.repay' : 'actions.repayIOwe')}
        </Button>
      )}
      {canWrite && !closed && <Menu label={translate('row.menu')} items={items} className="-mr-3" />}
    </li>
  )
}
