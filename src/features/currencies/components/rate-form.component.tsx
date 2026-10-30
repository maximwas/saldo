'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button.component'
import { DatePicker } from '@/components/ui/date-picker.component'
import { FormField } from '@/components/ui/form-field.component'
import { Input } from '@/components/ui/input.component'
import { Select } from '@/components/ui/select.component'
import { notify } from '@/components/ui/toaster.component'
import { CURRENCIES } from '@/constants/currencies.constants'
import { useClock } from '@/contexts/clock.context'
import { useLedger } from '@/contexts/ledger.context'
import { localDate } from '@/lib/utils/clock.utils'
import { useSaveRate } from '../hooks/currencies.hook'
import { type RateFormValues, rateFormSchema, toSaveRateInput } from '../schemas/rate-form.schema'

type RateFormProps = {
  baseCurrency: string
}

// shortcut: Figma «Saldo» has no frame for rates; the form is an inline card in the style of the settings cards
// ( · 11:72807): title card-title, fields gap 16, one primary button
export function RateForm({ baseCurrency }: RateFormProps) {
  const translate = useTranslations('currencies')
  const clock = useClock()
  const { ledgerId } = useLedger()
  const save = useSaveRate()
  const foreign = CURRENCIES.filter((currency) => currency !== baseCurrency)
  const today = localDate(clock.now(), clock.timeZone)
  const form = useForm<RateFormValues>({
    resolver: zodResolver(rateFormSchema),
    defaultValues: {
      currency: foreign[0],
      rate: '',
      rateOn: today,
    },
  })
  const currency = form.watch('currency')

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) =>
        save.mutate(
          toSaveRateInput(values, {
            ledgerId,
            baseCurrency,
          }),
          {
            onSuccess: () => {
              notify.success(translate('form.saved'))
              form.reset({
                currency: values.currency,
                rate: '',
                rateOn: today,
              })
            },
          },
        ),
      )}
      className="flex flex-col gap-4"
    >
      <p className="text-label text-text-secondary">{translate('form.hint')}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={form.control}
          name="currency"
          label={translate('form.currency')}
          render={(field) => (
            <Select
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              options={foreign.map((code) => ({
                value: code,
                label: `${translate(`names.${code}`)} (${code})`,
              }))}
            />
          )}
        />
        <FormField
          control={form.control}
          name="rate"
          label={translate('form.rate', {
            currency,
            base: baseCurrency,
          })}
          render={(field) => <Input {...field} inputMode="decimal" autoComplete="off" placeholder="41,50" />}
        />
        <FormField
          control={form.control}
          name="rateOn"
          label={translate('form.rateOn')}
          render={(field) => (
            <DatePicker name={field.name} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} />
          )}
        />
      </div>
      <Button type="submit" disabled={save.isPending} className="w-fit">
        {translate('form.save')}
      </Button>
    </form>
  )
}
