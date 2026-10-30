'use client'

import { Menu } from '@base-ui/react/menu'
import { Check, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { LedgerSummary } from '@/contexts/ledger.context'
import { cn } from '@/lib/utils/cn.utils'

type SpaceSwitcherProps = {
  spaces: readonly LedgerSummary[]
  currentId: string
  /** Sidebar: avatar 32, name and role, border; Topbar: avatar 24 and name only; button: the Space page's switch button */
  platform: 'sidebar' | 'topbar' | 'button'
  /** *Action: Next's name for a function prop a server parent may pass to a client component */
  onSelectAction?: (spaceId: string) => void
}

type SpaceAvatarProps = {
  name: string
  size: 'md' | 'sm'
}

// Figma «Saldo» → LetterAvatar Color=blue, Size 32 / 24
function SpaceAvatar({ name, size }: SpaceAvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center bg-cat-blue-soft text-cat-blue-text',
        size === 'md' ? 'size-8 rounded-logo-md text-label font-semibold' : 'size-6 rounded-sm text-micro',
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

// Figma «Saldo» → SpaceSwitcher 2:24192 (Sidebar / Topbar); menu items SpaceMenuItem 2:24191 in the Menu 2:10341 popup.
// With one space the switcher is just the name (design brief, shared access).
export function SpaceSwitcher({ spaces, currentId, platform, onSelectAction }: SpaceSwitcherProps) {
  const translate = useTranslations('shell')
  const current = spaces.find((space) => space.id === currentId) ?? spaces[0]

  if (!current) {
    return null
  }

  const popup = (
    <Menu.Portal>
      <Menu.Positioner align="start" className="z-50">
        <Menu.Popup className="flex flex-col gap-0.5 rounded-inner border border-border bg-raised p-1.5 shadow-float outline-none">
          {spaces.map((space) => (
            <Menu.Item
              key={space.id}
              onClick={() => onSelectAction?.(space.id)}
              className="flex h-14 w-72 items-center gap-3 rounded-sm px-3 outline-none data-highlighted:bg-subtle"
            >
              <SpaceAvatar name={space.name} size="md" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium text-text-primary">{space.name}</span>
                <span className="truncate text-caption text-text-tertiary">{translate(`roles.${space.role}`)}</span>
              </span>
              {space.id === current.id && (
                <Check aria-label={translate('currentSpace')} size={20} className="text-text-primary" />
              )}
            </Menu.Item>
          ))}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  )

  if (platform === 'button') {
    return (
      <Menu.Root>
        <Menu.Trigger className="flex h-11 min-w-0 cursor-pointer items-center whitespace-nowrap px-3 justify-center gap-1.5 rounded-md bg-subtle text-label font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {translate('space.switch')}
          <ChevronDown aria-hidden size={16} />
        </Menu.Trigger>
        {popup}
      </Menu.Root>
    )
  }

  const sidebar = platform === 'sidebar'
  const canSwitch = spaces.length > 1

  const body = (
    <>
      <SpaceAvatar name={current.name} size={sidebar ? 'md' : 'sm'} />
      {sidebar ? (
        <span className="flex min-w-0 flex-1 flex-col text-left">
          <span className="truncate text-label font-semibold text-text-primary">{current.name}</span>
          <span className="truncate text-caption text-text-tertiary">{translate(`roles.${current.role}`)}</span>
        </span>
      ) : (
        <span className="truncate text-label font-semibold text-text-primary">{current.name}</span>
      )}
      {canSwitch && <ChevronDown aria-hidden size={16} className="shrink-0 text-text-primary" />}
    </>
  )
  const boxClass = sidebar
    ? 'flex h-14 w-full items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-2'
    : 'flex h-11 items-center gap-2 rounded-md px-1'

  if (!canSwitch) {
    return <div className={boxClass}>{body}</div>
  }

  return (
    <Menu.Root>
      <Menu.Trigger className={cn(boxClass, 'outline-none focus-visible:ring-2 focus-visible:ring-primary')}>
        {body}
      </Menu.Trigger>
      {popup}
    </Menu.Root>
  )
}
