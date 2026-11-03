'use client'

import { ChevronRight } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRipple } from '@/components/ui/ripple.hook'

type SettingsLinkProps = {
  href: Route
  /** the 20 px icon element: a server page cannot pass a component to this client one */
  icon: React.ReactNode
  title: string
  subtitle: React.ReactNode
}

// Figma «Saldo» → Settings / Mobile 2:35769, a row of the sections card: height 64 with a divider (none under the last,
// the list item is the group), gap 12, CategoryIcon neutral 40, title body-medium, subtitle caption tertiary, chevron 20
export function SettingsLink({ href, icon, title, subtitle }: SettingsLinkProps) {
  const { pressProps, ripple } = useRipple()

  return (
    <Link
      href={href}
      className="relative -mx-3 flex min-h-16 cursor-pointer items-start gap-3 overflow-hidden rounded-md border-b border-border px-3 py-2.5 outline-none transition-colors group-last:border-b-0 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary"
      {...pressProps}
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-text-secondary"
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body font-medium text-text-primary">{title}</span>
        <span className="truncate text-caption text-text-tertiary">{subtitle}</span>
      </span>
      <ChevronRight aria-hidden className="my-0.5 size-5 shrink-0 text-text-primary" />
      {ripple}
    </Link>
  )
}
