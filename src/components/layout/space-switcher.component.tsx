'use client'

import { Menu } from '@base-ui/react/menu'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useRipple } from '@/components/ui/ripple.hook'
import { LetterAvatar } from '@/components/ui/service-logo.component'
import { Sheet, useIsDesktop } from '@/components/ui/sheet.component'
import { CreateSpaceDialog } from '@/features/ledgers/components/create-space-dialog.component'
import { cn } from '@/lib/utils/cn.utils'
import type { LedgerSummary } from '@/store/ledger.store'

type SpaceSwitcherProps = {
  spaces: readonly LedgerSummary[]
  currentId: string
  /** Sidebar: avatar 32, name and role, border; Topbar: avatar 24 and name only; button: the Space page's switch button */
  platform: 'sidebar' | 'topbar' | 'button'
  /** *Action: Next's name for a function prop a server parent may pass to a client component */
  onSelectAction?: (spaceId: string) => void
}

type SpaceRowProps = {
  /** desktop: an item of the popover menu; phones: a button of the bottom sheet */
  menu: boolean
  onSelect: () => void
  className: string
  children: React.ReactNode
}

// a clickable row: hover subtle and a ripple from the press point, like every list row
function SpaceRow({ menu, onSelect, className, children }: SpaceRowProps) {
  const { pressProps, ripple } = useRipple()
  const rowClass = cn(
    'relative flex items-center gap-3 overflow-hidden rounded-sm px-3 outline-none transition-colors',
    className,
  )

  return menu ? (
    <Menu.Item onClick={onSelect} className={cn(rowClass, 'data-highlighted:bg-subtle')} {...pressProps}>
      {children}
      {ripple}
    </Menu.Item>
  ) : (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        rowClass,
        'w-full cursor-pointer text-left hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary',
      )}
      {...pressProps}
    >
      {children}
      {ripple}
    </button>
  )
}

// Figma «Saldo» → SpaceSwitcher 2:24192 (Sidebar / Topbar); menu items SpaceMenuItem 2:24191 in the Menu 2:10341 popup.
// The menu always opens, even with one space: "Create space" (plan 1.17b) lives in it (Space menu 2:40453).
export function SpaceSwitcher({ spaces, currentId, platform, onSelectAction }: SpaceSwitcherProps) {
  const translate = useTranslations('shell')
  const [creating, setCreating] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  // below md the list is a bottom sheet (Figma BottomSheet 2:10281), from md up a popover menu
  const desktop = useIsDesktop()
  const current = spaces.find((space) => space.id === currentId) ?? spaces[0]

  if (!current) {
    return null
  }

  const popup = (
    <Menu.Portal>
      <Menu.Positioner align="start" className="z-50">
        <Menu.Popup className="flex flex-col gap-0.5 rounded-inner border border-border bg-raised p-1.5 shadow-float outline-none">
          <Menu.Group className="flex flex-col gap-0.5">
            <Menu.GroupLabel className="px-3 pt-2 pb-1 text-caption font-medium text-text-tertiary">
              {translate('space.list')}
            </Menu.GroupLabel>
            {spaces.map((space) => (
              <SpaceRow key={space.id} menu onSelect={() => onSelectAction?.(space.id)} className="h-14 w-72">
                <LetterAvatar name={space.name} size={32} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-medium text-text-primary">{space.name}</span>
                  <span className="truncate text-caption text-text-tertiary">{translate(`roles.${space.role}`)}</span>
                </span>
                {space.id === current.id && (
                  <Check aria-label={translate('currentSpace')} size={20} className="text-text-primary" />
                )}
              </SpaceRow>
            ))}
          </Menu.Group>
          <Menu.Separator className="my-1 h-px bg-border" />
          <SpaceRow menu onSelect={() => setCreating(true)} className="h-10 text-body text-text-primary">
            <Plus aria-hidden size={20} />
            {translate('space.create.action')}
          </SpaceRow>
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  )

  const sheet = (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen} title={translate('space.list')}>
      <div className="flex flex-col gap-0.5">
        {spaces.map((space) => (
          <SpaceRow
            key={space.id}
            menu={false}
            onSelect={() => {
              setSheetOpen(false)
              onSelectAction?.(space.id)
            }}
            className="h-14"
          >
            <LetterAvatar name={space.name} size={32} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body font-medium text-text-primary">{space.name}</span>
              <span className="truncate text-caption text-text-tertiary">{translate(`roles.${space.role}`)}</span>
            </span>
            {space.id === current.id && (
              <Check aria-label={translate('currentSpace')} size={20} className="text-text-primary" />
            )}
          </SpaceRow>
        ))}
        <div className="my-1 h-px bg-border" />
        <SpaceRow
          menu={false}
          onSelect={() => {
            setSheetOpen(false)
            setCreating(true)
          }}
          className="h-11 text-body text-text-primary"
        >
          <Plus aria-hidden size={20} />
          {translate('space.create.action')}
        </SpaceRow>
      </div>
    </Sheet>
  )

  const dialog = <CreateSpaceDialog open={creating} onOpenChange={setCreating} />

  // the same trigger look on both: a Menu.Trigger on desktop, a plain button that opens the sheet below md
  const renderRoot = (className: string, children: React.ReactNode) =>
    desktop ? (
      <Menu.Root>
        <Menu.Trigger className={className}>{children}</Menu.Trigger>
        {popup}
      </Menu.Root>
    ) : (
      <>
        <button type="button" className={className} onClick={() => setSheetOpen(true)}>
          {children}
        </button>
        {sheet}
      </>
    )

  if (platform === 'button') {
    return (
      <>
        {renderRoot(
          'flex h-11 min-w-0 cursor-pointer items-center whitespace-nowrap px-3 justify-center gap-1.5 rounded-md bg-subtle text-label font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary',
          <>
            {translate('space.switch')}
            <ChevronDown aria-hidden size={16} />
          </>,
        )}
        {dialog}
      </>
    )
  }

  const sidebar = platform === 'sidebar'

  const body = (
    <>
      <LetterAvatar name={current.name} size={sidebar ? 32 : 24} />
      {sidebar ? (
        <span className="flex min-w-0 flex-1 flex-col text-left">
          <span className="truncate text-label font-semibold text-text-primary">{current.name}</span>
          <span className="truncate text-caption text-text-tertiary">{translate(`roles.${current.role}`)}</span>
        </span>
      ) : (
        <span className="truncate text-label font-semibold text-text-primary">{current.name}</span>
      )}
      <ChevronDown aria-hidden size={16} className="shrink-0 text-text-primary" />
    </>
  )
  const boxClass = sidebar
    ? 'flex h-14 w-full items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-2'
    : 'flex h-11 items-center gap-2 rounded-md px-1'

  return (
    <>
      {renderRoot(cn(boxClass, 'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary'), body)}
      {dialog}
    </>
  )
}
