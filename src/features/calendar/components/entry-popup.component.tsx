'use client'

import { Popover } from '@base-ui/react/popover'
import { Check, Trash2, X } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { parseAsString, useQueryStates } from 'nuqs'
import { useEffect, useState } from 'react'
import { Amount } from '@/components/ui/amount.component'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import { useCanWrite } from '@/contexts/ledger.context'
import { useIsSheetDialog } from '@/lib/utils/media-query.hook'
import type { CalendarEntry } from '../api/calendar.api'
import { useCalendarData } from '../hooks/calendar.hook'
import { useCalendarParams } from '../hooks/calendar-params.hook'
import { useEntrySource, useEntryType, usePopupStatus } from '../hooks/entry-labels.hook'
import { entryStatus, signedMinor, sourceHref } from '../utils/calendar.utils'
import { amountKind, EntryTile, STATUS_ICON } from './entry-row.component'
import { entryPopup } from './entry-trigger.component'
import { RemoveEntryDialog } from './remove-entry-dialog.component'

const OPEN_STATES = ['plan', 'partial', 'unconfirmed']
const SOURCE_LINKS = ['subscription', 'credit', 'debt']
const SERIES_SOURCES = ['credit', 'debt']

/** phones: a 36 quiet button keeps its look, an invisible 4 above and below makes its tap area 44 (Figma 55:127552) */
export const QUIET_TAP = 'relative max-md:after:absolute max-md:after:inset-x-0 max-md:after:-inset-y-1'

/** the obligation sheets of «Upcoming» live in the page: the calendar only puts the obligation id into the URL */
const useObligationSheets = () =>
  useQueryStates({
    pay: parseAsString,
    move: parseAsString,
    unpay: parseAsString,
  })[1]

type DetailsProps = {
  entry: CalendarEntry
  /** closes the popup or the sheet before a sheet of its action opens */
  onCloseAction: () => void
  onRemoveAction: () => void
}

function EntryActions({ entry, onCloseAction, onRemoveAction }: DetailsProps) {
  const translate = useTranslations('calendar')
  const canWrite = useCanWrite()
  const openSheet = useObligationSheets()
  const plan = entry.entry === 'plan'
  // a debt's plan is paid by a repayment on the debt (add_debt_movement), never by «Paid»
  const payable = canWrite && plan && OPEN_STATES.includes(entry.state) && entry.sourceType !== 'debt'
  // a plan with nothing paid and not a credit / debt installment (those leave through their own card)
  const removable =
    canWrite &&
    plan &&
    entry.state === 'plan' &&
    !entry.paidMinor &&
    entry.obligationId !== null &&
    !SERIES_SOURCES.includes(entry.sourceType ?? '')
  const then = (sheet: Parameters<typeof openSheet>[0]) => {
    onCloseAction()
    void openSheet(sheet)
  }

  if (plan) {
    return payable || removable ? (
      <div className="flex flex-col gap-2 max-md:pb-3">
        {payable && (
          <div className="flex gap-3 *:flex-1">
            <Button variant="secondary" onClick={() => then({ move: entry.obligationId })}>
              {translate('actions.move')}
            </Button>
            <Button onClick={() => then({ pay: entry.obligationId })}>
              <Check aria-hidden className="size-5" />
              {translate('actions.pay')}
            </Button>
          </div>
        )}
        {removable && (
          <Button variant="ghost" size="s" className={`${QUIET_TAP} max-md:text-body`} onClick={onRemoveAction}>
            <Trash2 aria-hidden className="size-4 max-md:size-5" />
            {translate('actions.remove')}
          </Button>
        )}
      </div>
    ) : null
  }

  return (
    <div className="flex flex-col gap-2 max-md:pb-3">
      <Button
        variant="secondary"
        render={<Link href={`/operations?operation=${entry.id}` as Route} />}
        nativeButton={false}
      >
        {translate('actions.operation')}
      </Button>
      {canWrite && entry.obligationId !== null && (
        <Button variant="danger" size="s" className={QUIET_TAP} onClick={() => then({ unpay: entry.obligationId })}>
          {translate('actions.unpay')}
        </Button>
      )}
    </div>
  )
}

// Figma «Saldo» → Entry popover 52:127229 (planned) / 54:127338 (paid) and BottomSheet 55:127552 / 56:127659: a 40 tile
// at the top, the amount (L, plan or fact) and a 16 icon with the status, «Where this entry comes from» on subtle with
// «Open …», then a plan's «Change the date» + «Paid» and a quiet «Remove from the calendar», or a paid one's «Open the
// operation» and a Danger S «Cancel the payment». A viewer sees the same without the writes.
function EntryDetails(props: DetailsProps) {
  const { entry } = props
  const translate = useTranslations('calendar')
  const source = useEntrySource()
  const status = usePopupStatus()
  const StatusIcon = STATUS_ICON[entryStatus(entry)]
  const href = sourceHref(entry.sourceType, entry.sourceId)
  const sourceKey = SOURCE_LINKS.includes(entry.sourceType ?? '') ? entry.sourceType : 'other'

  return (
    <>
      <div className="flex items-start gap-3">
        <EntryTile entry={entry} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Amount minor={signedMinor(entry)} currency={entry.currency} kind={amountKind(entry)} size="l" />
          <p className="flex items-start gap-1.5 text-label font-medium text-text-secondary">
            {StatusIcon ? (
              <span className="flex shrink-0 py-0.5">
                <StatusIcon aria-hidden className="size-4" />
              </span>
            ) : null}
            {status(entry)}
          </p>
        </div>
      </div>
      {href && (
        <div className="flex items-center gap-3 rounded-md bg-subtle py-3 pr-3 pl-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-caption text-text-tertiary">{translate('popup.source')}</span>
            <span className="text-label font-medium text-text-primary">{source(entry)}</span>
          </div>
          <Button
            variant="ghost"
            size="s"
            className={QUIET_TAP}
            render={<Link href={href as Route} />}
            nativeButton={false}
          >
            {translate(`actions.source.${sourceKey as 'other'}`)}
          </Button>
        </div>
      )}
      <EntryActions {...props} />
    </>
  )
}

const CLOSE_CLASS =
  'flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-secondary outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary'

// The popup of the entry in ?item=: on desktop a popover anchored to the clicked line (no dimming; Esc or a click outside
// closes it), on phones a bottom sheet with the same parts. «Remove from the calendar» asks in its own dialog.
export function EntryPopup() {
  const translate = useTranslations('common')
  const desktop = useIsSheetDialog()
  const type = useEntryType()
  const { item, setUrl } = useCalendarParams()
  const { entries, known } = useCalendarData()
  const [removing, setRemoving] = useState<CalendarEntry | null>(null)
  const loaded = entries.data !== undefined
  const find = (id: string | null | undefined) => known.find((entry) => entry.id === id)
  const close = () => void setUrl({ item: null })

  // a link with ?item= opens the popup at the first place the entry shows, once the entries are on screen
  useEffect(() => {
    if (!desktop || item === null || !loaded || entryPopup.isOpen) {
      return
    }

    const trigger = document.querySelector(`[data-entry="${CSS.escape(item)}"]`)

    if (trigger?.id) {
      entryPopup.open(trigger.id)
    }
  }, [desktop, item, loaded])

  const remove = (entry: CalendarEntry, closePopup: () => void) => () => {
    closePopup()
    setRemoving(entry)
  }
  const removeDialog = removing ? <RemoveEntryDialog entry={removing} onCloseAction={() => setRemoving(null)} /> : null

  if (!desktop) {
    const entry = find(item)

    return (
      <>
        {entry ? (
          <Sheet open onOpenChange={(open) => !open && close()} title={entry.title ?? type(entry)}>
            <EntryDetails entry={entry} onCloseAction={close} onRemoveAction={remove(entry, close)} />
          </Sheet>
        ) : null}
        {removeDialog}
      </>
    )
  }

  const closePopover = () => entryPopup.close()

  return (
    <>
      <Popover.Root handle={entryPopup} onOpenChange={(open) => !open && close()}>
        {({ payload }) => {
          const entry = find(payload)

          return entry ? (
            <Popover.Portal>
              {/* beside the entry, not above it: above, it covered the toolbar and the view switcher (QA 12.11) */}
              <Popover.Positioner side="inline-end" align="start" sideOffset={8} collisionPadding={16} className="z-30">
                <Popover.Popup className="flex max-h-(--available-height) w-96 max-w-(--available-width) flex-col gap-5 overflow-y-auto rounded-card bg-raised p-6 shadow-float outline-none transition-opacity duration-(--duration-base) ease-(--ease-standard) data-ending-style:opacity-0 data-starting-style:opacity-0">
                  <div className="flex items-center gap-3">
                    <Popover.Title className="flex-1 text-card-title text-text-primary">
                      {entry.title ?? type(entry)}
                    </Popover.Title>
                    <Popover.Close aria-label={translate('close')} className={CLOSE_CLASS}>
                      <X aria-hidden className="size-5" />
                    </Popover.Close>
                  </div>
                  <div className="flex flex-col gap-4">
                    <EntryDetails
                      entry={entry}
                      onCloseAction={closePopover}
                      onRemoveAction={remove(entry, closePopover)}
                    />
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          ) : null
        }}
      </Popover.Root>
      {removeDialog}
    </>
  )
}
