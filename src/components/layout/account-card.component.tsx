'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/avatar.component'
import { useMyProfile } from '@/lib/members/members.hook'

// Figma «Saldo» → Space tab 11:73245, Account card 59:152992: my account on top of the tab (photo 40, name
// label-semibold, email caption, chevron-right 20; padding 16/20, gap 12, card); a tap opens Settings → General
export function AccountCard() {
  const profile = useMyProfile()

  return (
    <Link
      href="/settings/general"
      className="flex items-start gap-3 rounded-card bg-card px-5 py-4 shadow-card outline-none transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Avatar name={profile.name} src={profile.avatarUrl} size={40} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-label font-semibold text-text-primary">{profile.name}</span>
        <span className="truncate text-caption text-text-tertiary">{profile.email}</span>
      </span>
      <span className="flex h-5 items-center">
        <ChevronRight aria-hidden size={20} className="text-text-secondary" />
      </span>
    </Link>
  )
}
