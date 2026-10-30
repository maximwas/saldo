'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useState } from 'react'
import type { ObligationRow } from '../api/obligations.api'
import { useObligationOptions, useObligations } from '../hooks/obligations.hook'
import { ChangeDateSheet } from './change-date-sheet.component'
import { PayObligationSheet } from './pay-obligation-sheet.component'

// «Paid» (?pay=<obligation id>) and «Change the date» (?move=<obligation id>) of an open obligation for any screen that
// puts the id into its URL: «Upcoming» renders it, the calendar page mounts it next to the calendar. The row is kept as
// it was when the sheet opened: if someone else pays meanwhile, submitting gets PT409 with a clear message instead of
// the sheet vanishing under the hands.
export function ObligationSheetsHost() {
  const [{ pay, move }, setParams] = useQueryStates({
    pay: parseAsString,
    move: parseAsString,
  })
  const { data } = useObligations()
  const options = useObligationOptions()
  const [opened, setOpened] = useState<ObligationRow | null>(null)
  const id = pay ?? move
  const found = data?.open.find((row) => row.id === id)

  if (found && opened?.id !== found.id) {
    setOpened(found)
  }

  if (!options.data || !opened || opened.id !== id) {
    return null
  }

  if (pay) {
    return <PayObligationSheet key={opened.id} obligation={opened} onClose={() => void setParams({ pay: null })} />
  }

  return <ChangeDateSheet key={opened.id} obligation={opened} onCloseAction={() => void setParams({ move: null })} />
}
