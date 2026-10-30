'use client'

import { UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { useLedger } from '@/contexts/ledger.context'
import { switchLedger } from '@/features/ledgers/api/ledgers.actions'
import { SpaceSwitcher } from './space-switcher.component'
import { SyncStatus } from './sync-status.component'

// Figma «Saldo» → "Menu C · Space" 11:73245, Space card: padding 20, gap 16; the avatar sits at the top of the head
export function SpaceCard() {
  const ledger = useLedger()
  const translate = useTranslations('shell')
  const current = ledger.ledgers.find((space) => space.id === ledger.ledgerId) ?? ledger.ledgers[0]

  if (!current) {
    return null
  }

  return (
    <section className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-cat-blue-soft text-body font-semibold text-cat-blue-text"
        >
          {current.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <h2 className="max-w-full truncate text-card-title text-text-primary">{current.name}</h2>
          {/* shortcut: Figma adds "only you"; the member count is not loaded yet, so the role only */}
          <p className="text-caption text-text-tertiary">{translate(`roles.${current.role}`)}</p>
          {/* shortcut: static «synced» until the offline queue (phase 8) reports its state */}
          <SyncStatus state="synced" label={translate('synced')} className="h-7 rounded-full bg-subtle" />
        </div>
      </div>
      <div className="flex gap-2">
        <SpaceSwitcher
          spaces={ledger.ledgers}
          currentId={ledger.ledgerId}
          platform="button"
          onSelectAction={switchLedger}
        />
        {/* shortcut: Invite opens Settings until the access tab (plan 1.18) exists */}
        {current.role === 'owner' && (
          <Button
            variant="ghost"
            render={<Link href="/settings" />}
            nativeButton={false}
            className="flex-1 cursor-pointer gap-1.5 bg-primary-soft text-label font-semibold"
          >
            <UserPlus aria-hidden size={16} />
            {translate('space.invite')}
          </Button>
        )}
      </div>
    </section>
  )
}
