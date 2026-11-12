'use client'

import { ChevronUp, LogOut, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Avatar } from '@/components/ui/avatar.component'
import { Menu } from '@/components/ui/menu.component'
import { useMyProfile } from '@/lib/members/members.hook'
import { useSignOut } from './sign-out.hook'

// Figma «Saldo» → AccountButton 59:151252 at the bottom of the Sidebar (photo 32, name label-semibold, email caption
// truncated, chevron-up; padding 8/10, gap 10, radius md, hover subtle) and its menu 59:154242 opening above it:
// account settings, a divider, sign-out in red
export function AccountMenu() {
  const translate = useTranslations('shell.account')
  const router = useRouter()
  const profile = useMyProfile()
  const { start, confirmSheet } = useSignOut()

  return (
    <>
      <Menu
        label={translate('menu')}
        items={[
          {
            label: translate('settings'),
            Icon: Settings,
            onSelect: () => router.push('/settings/general'),
          },
          {
            label: translate('signOut'),
            Icon: LogOut,
            danger: true,
            onSelect: start,
          },
        ]}
        trigger={
          <button
            type="button"
            className="flex w-full cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-2 text-left outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary data-popup-open:bg-subtle"
          >
            <Avatar name={profile.name} src={profile.avatarUrl} size={32} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-label font-semibold text-text-primary">{profile.name}</span>
              <span className="truncate text-caption text-text-tertiary">{profile.email}</span>
            </span>
            <span className="flex h-5 items-center">
              <ChevronUp aria-hidden size={16} className="text-text-secondary" />
            </span>
          </button>
        }
      />
      {confirmSheet}
    </>
  )
}
