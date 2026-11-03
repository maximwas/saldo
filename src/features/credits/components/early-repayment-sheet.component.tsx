'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Amount } from '@/components/ui/amount.component'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { Sheet, SheetClose } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { useToday } from '@/contexts/clock.context'
import { useZodResolver } from '@/lib/forms/zod-resolver.hook'
import type { Credit } from '../api/credits.api'
import { usePayInstallment, useReplaceCreditSchedule } from '../hooks/credits.hook'
import {
  type EarlyRepaymentFormValues,
  earlyRepaymentFormSchema,
  toReplaceCreditScheduleInput,
} from '../schemas/early-repayment-form.schema'
import { moneyText, type Payoff } from '../utils/credits.utils'

type EarlyRepaymentSheetProps = {
  credit: Credit
  payoff: Payoff
  onCloseAction: () => void
}

const FORM_ID = 'early-repayment-form'

// Figma «Saldo» → Credit card · Early repayment 2:55162: what is left, the amount and the date, a confirm. The
// unpaid installments give way to one installment of the whole rest (replace_credit_schedule); the actual payment is
// then confirmed in the «Paid» sheet of Upcoming payments — one flow, one operation. A partial payoff needs the bank's
// new schedule, which Saldo never guesses (§9).
export function EarlyRepaymentSheet({ credit, payoff, onCloseAction }: EarlyRepaymentSheetProps) {
  const translate = useTranslations('credits')
  const locale = useLocale()
  const today = useToday()
  const replace = useReplaceCreditSchedule()
  const pay = usePayInstallment()
  // one id per open sheet: a retry after a lost answer replays the same schedule
  const [id] = useState(() => crypto.randomUUID())
  const form = useForm<EarlyRepaymentFormValues>({
    resolver: useZodResolver(earlyRepaymentFormSchema),
    defaultValues: { payOn: today },
  })

  const onSubmit = form.handleSubmit((values) =>
    replace.mutate(
      toReplaceCreditScheduleInput(values, {
        id,
        creditId: credit.id,
        version: credit.version,
        payoff,
      }),
      {
        onSuccess: () => {
          notify.success(translate('payoff.done'))
          pay(id)
        },
      },
    ),
  )

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onCloseAction()}
      title={translate('payoff.title')}
      footer={
        <>
          <SheetClose>{translate('payoff.cancel')}</SheetClose>
          <Button type="submit" form={FORM_ID} disabled={replace.isPending}>
            {translate('payoff.confirm')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <p className="text-label text-text-secondary">
          {translate('payoff.text', {
            amount: moneyText(payoff.amountMinor, credit.currency, locale),
            count: payoff.count,
          })}
        </p>
        <div className="flex flex-col gap-1">
          <span className="text-label text-text-secondary">{translate('payoff.amount')}</span>
          <Amount minor={payoff.amountMinor} currency={credit.currency} size="l" />
        </div>
        <FormField
          control={form.control}
          name="payOn"
          label={translate('payoff.date')}
          render={(field) => (
            <DatePicker
              value={field.value}
              onValueChange={(next) => field.onChange(next ?? '')}
              onBlur={field.onBlur}
            />
          )}
        />
        <Banner>{translate('payoff.partialHint')}</Banner>
      </form>
    </Sheet>
  )
}
