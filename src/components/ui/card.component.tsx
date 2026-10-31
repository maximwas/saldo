import { ChevronRight } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn.utils'

type CardProps = {
  title: string
  /** "All payments ›": label and href of the link in the header */
  action?: {
    label: string
    href: string
  }
  className?: string
  children: React.ReactNode
}

// Figma «Saldo» → Card 2:7964: white, radius/card, shadow/card, padding 24 (20 on mobile), gap 20, title card-title,
// the action label-medium primary-text with a 16 chevron, gap 4
export function Card({ title, action, className, children }: CardProps) {
  return (
    <section className={cn('flex flex-col gap-5 rounded-card bg-card p-5 shadow-card lg:p-6', className)}>
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-card-title text-text-primary">{title}</h2>
        {action && (
          <Link
            href={action.href as Route}
            className="flex cursor-pointer items-center gap-1 rounded-xs text-label font-medium text-primary-text outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {action.label}
            <ChevronRight aria-hidden size={16} />
          </Link>
        )}
      </header>
      {children}
    </section>
  )
}
