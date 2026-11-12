import { ChevronRight } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn.utils'

const ACTION_CLASS =
  'relative flex cursor-pointer items-center gap-1 rounded-xs text-label font-medium text-primary-text outline-none after:absolute after:-inset-y-3 after:inset-x-0 hover:underline focus-visible:ring-2 focus-visible:ring-primary'

type CardProps = {
  /** a string is the card-title heading; a node (a month switch) brings its own heading */
  title: React.ReactNode
  /** "All payments ›": label and href of the link in the header, or a button when it opens a dialog on the page;
   * the label can differ by breakpoint, `className` hides the action where the frame has none */
  action?:
    | {
        label: React.ReactNode
        href: string
        className?: string
      }
    | {
        label: React.ReactNode
        onClickAction: () => void
        className?: string
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
        {typeof title === 'string' ? <h2 className="text-card-title text-text-primary">{title}</h2> : title}
        {action &&
          ('href' in action ? (
            <Link href={action.href as Route} className={cn(ACTION_CLASS, action.className)}>
              {action.label}
              <ChevronRight aria-hidden size={16} />
            </Link>
          ) : (
            <button type="button" onClick={action.onClickAction} className={cn(ACTION_CLASS, action.className)}>
              {action.label}
              <ChevronRight aria-hidden size={16} />
            </button>
          ))}
      </header>
      {children}
    </section>
  )
}
