import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'

type SettingsLinkProps = {
  href: Route
  icon: LucideIcon
  title: string
  subtitle: React.ReactNode
}

// Figma «Saldo» → Settings / Mobile 2:35769, a row of the sections card: height 64 with a divider (none under the last,
// the list item is the group), gap 12, CategoryIcon neutral 40, title body-medium, subtitle caption tertiary, chevron 20
export function SettingsLink({ href, icon: Icon, title, subtitle }: SettingsLinkProps) {
  return (
    <Link
      href={href}
      className="flex h-16 cursor-pointer items-center gap-3 border-b border-border outline-none group-last:border-b-0 focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-text-secondary"
      >
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body font-medium text-text-primary">{title}</span>
        <span className="truncate text-caption text-text-tertiary">{subtitle}</span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-text-primary" />
    </Link>
  )
}
