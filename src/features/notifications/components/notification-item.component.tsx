'use client'

import { Bell } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useFormatter, useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge.component'
import { useClock } from '@/contexts/clock.context'
import type { AppNotification } from '../api/notifications.api'

type NotificationItemProps = {
  item: AppNotification
  onReadAction: (id: string) => void
}

const DELIVERY_TONE = {
  sent: 'positive',
  failed: 'negative',
  pending: 'neutral',
  no_subscription: 'muted',
} as const

const ACTION_CLASS =
  'cursor-pointer rounded-xs text-label font-medium text-primary-text outline-none focus-visible:ring-2 focus-visible:ring-primary'

// Figma «Saldo» → Notifications 2:59946 NotificationItem: white card (radius card, shadow), round leading mark,
// title body-medium, text label secondary, caption time + a blue action; a primary dot at the right marks a new one.
// The mark is the bell: the frames use service logos and sources the notification row does not carry.
export function NotificationItem({ item, onReadAction }: NotificationItemProps) {
  const translate = useTranslations('notifications.item')
  const formatter = useFormatter()
  const { timeZone } = useClock()
  const unread = !item.readAt
  const delivery = item.deliveryStatus as keyof typeof DELIVERY_TONE | null
  const time = formatter.dateTime(new Date(item.createdAt), {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })

  return (
    <li className="relative flex gap-3 rounded-card bg-card p-4 shadow-card">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-text-secondary">
        <Bell aria-hidden size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="text-body font-semibold text-text-primary">{item.title}</h3>
        <p className="text-label text-text-secondary">{item.body}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <time dateTime={item.createdAt} className="text-caption text-text-tertiary">
            {time}
          </time>
          {item.linkPath ? (
            <Link
              href={item.linkPath as Route}
              onClick={() => unread && onReadAction(item.id)}
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
          className="absolute top-4 right-4 size-2 rounded-full bg-primary"
        />
      ) : null}
    </li>
  )
}
