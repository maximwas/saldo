'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useFormatter, useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'
import { useClock } from '@/contexts/clock.context'
import { localDate } from '@/lib/utils/clock.utils'
import type { AppNotification } from '../api/notifications.api'

type NotificationItemProps = {
  item: AppNotification
  onReadAction: (id: string) => void
  /** the link was followed: the popover / sheet that shows the item closes */
  onOpenAction?: () => void
}

const DELIVERY_TONE = {
  sent: 'positive',
  failed: 'negative',
  pending: 'neutral',
  no_subscription: 'muted',
} as const

const ACTION_CLASS =
  'cursor-pointer rounded-xs text-label font-medium text-primary-text outline-none focus-visible:ring-2 focus-visible:ring-primary'

// Figma «Saldo» → NotificationItem (2:59946, popover 2:61239): radius md on the card fill, padding 12/16, gap 12, the 40
// mark (a service logo or a letter) from the title's source, title body-semibold, text label secondary, meta caption
// time + label-medium action, a primary dot at the right for a new one. Today shows the time, earlier ones the date.
// The mark is read from «Netflix: …» (the notification row has no source column).
export function NotificationItem({ item, onReadAction, onOpenAction }: NotificationItemProps) {
  const translate = useTranslations('notifications.item')
  const formatter = useFormatter()
  const { now, timeZone } = useClock()
  const unread = !item.readAt
  const delivery = item.deliveryStatus as keyof typeof DELIVERY_TONE | null
  const created = new Date(item.createdAt)
  const today = localDate(created, timeZone) === localDate(now(), timeZone)
  const time = formatter.dateTime(
    created,
    today
      ? {
          hour: '2-digit',
          minute: '2-digit',
          timeZone,
        }
      : {
          day: '2-digit',
          month: '2-digit',
          timeZone,
        },
  )

  return (
    <li className="relative flex gap-3 rounded-md bg-card px-4 py-3">
      <ServiceLogo name={item.title.split(':')[0]} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="text-body font-semibold text-text-primary">{item.title}</h3>
        <p className="text-label text-text-secondary">{item.body}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          <time dateTime={item.createdAt} className="text-caption text-text-tertiary">
            {time}
          </time>
          {item.linkPath ? (
            <Link
              href={item.linkPath as Route}
              onClick={() => {
                if (unread) {
                  onReadAction(item.id)
                }

                onOpenAction?.()
              }}
              className={ACTION_CLASS}
            >
              {translate('open')}
            </Link>
          ) : null}
          {unread ? (
            <button type="button" onClick={() => onReadAction(item.id)} className={ACTION_CLASS}>
              {translate('markRead')}
            </button>
          ) : null}
          {delivery ? <Badge tone={DELIVERY_TONE[delivery]}>{translate(`delivery.${delivery}`)}</Badge> : null}
        </div>
      </div>
      {unread ? (
        <span
          aria-label={translate('new')}
          role="img"
          className="absolute top-3 right-4 size-2 rounded-full bg-primary"
        />
      ) : null}
    </li>
  )
}
