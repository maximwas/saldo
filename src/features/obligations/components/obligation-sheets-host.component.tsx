'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useState } from 'react'
import type { ObligationRow } from '../api/obligations.api'
import { useObligationOptions, useObligations } from '../hooks/obligations.hook'
import { CancelPaymentSheet } from './cancel-payment-sheet.component'
import { ChangeDateSheet } from './change-date-sheet.component'
import { PayObligationSheet } from './pay-obligation-sheet.component'

// «Paid» (?pay=<obligation id>) and «Change the date» (?move=<obligation id>) of an open obligation, and «Cancel the
// payment» (?unpay=<obligation id>) of a paid one, for any screen that puts the id into its URL: «Upcoming» renders it,
// the calendar page mounts it next to the calendar. The row is kept as it was when the sheet opened: if someone else
// pays meanwhile, submitting gets PT409 with a clear message instead of the sheet vanishing under the hands.
// shortcut: «Cancel the payment» finds only the open and the last paid obligations Upcoming reads; fetch one by id if
// an older payment ever needs it.
export function ObligationSheetsHost() {
  const [{ pay, move, unpay }, setParams] = useQueryStates({
    pay: parseAsString,
    move: parseAsString,
    unpay: parseAsString,
  })
  const { data } = useObligations()
  const options = useObligationOptions()
  const [opened, setOpened] = useState<ObligationRow | null>(null)
  const id = pay ?? move ?? unpay
  // only an open obligation is paid or moved; a payment is cancelled on an open (partly paid) or a paid one
  const rows = unpay ? [...(data?.open ?? []), ...(data?.paid ?? [])] : data?.open
  const found = rows?.find((row) => row.id === id)

  // a closed sheet forgets its row, so the next one opens on the fresh row: after «Change the date» the old snapshot
  // kept the old date and version, and «Paid» failed with PT409 until a reload (QA 12.11)
  if (id === null && opened !== null) {
    setOpened(null)
  }

  if (found && opened?.id !== found.id) {
    setOpened(found)
  }

  if (!options.data || !opened || opened.id !== id) {
    return null
  }

  if (pay) {
    return <PayObligationSheet key={opened.id} obligation={opened} onClose={() => void setParams({ pay: null })} />
  }

  if (unpay) {
    return <CancelPaymentSheet key={opened.id} obligation={opened} onClose={() => void setParams({ unpay: null })} />
  }

  return <ChangeDateSheet key={opened.id} obligation={opened} onCloseAction={() => void setParams({ move: null })} />
}
