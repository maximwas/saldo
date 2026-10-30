import { useTranslations } from 'next-intl'
import { useId } from 'react'
import { cn } from '@/lib/utils/cn.utils'

type BrandProps = {
  className?: string
}

// Figma "Saldo": Brand 4:79956 (mark 32 + name, gap 10); the mark is the component Brand/Mark 10:71281, logo A2.
// Gradient stops are the --brand-* tokens (globals.css), so the theme switches them; the dark mark follows «A2 dark».
export function Brand({ className }: BrandProps) {
  const brand = useTranslations('common')('brand')
  // two Brands can share a page (login: mobile and desktop), so gradient ids must be unique; useId has colons
  const gradientId = useId().replace(/[^\w-]/g, '')
  const topId = `${gradientId}-top`
  const bottomId = `${gradientId}-bottom`

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="size-8 shrink-0 rounded-logo-md bg-primary dark:border dark:border-border dark:bg-card"
      >
        <defs>
          <linearGradient id={topId} gradientUnits="userSpaceOnUse" x1="37.06" y1="0.38" x2="62.94" y2="71.5">
            <stop offset="0" style={{ stopColor: 'var(--brand-arc-top-from)' }} />
            <stop offset="1" style={{ stopColor: 'var(--brand-arc-top-to)' }} />
          </linearGradient>
          <linearGradient id={bottomId} gradientUnits="userSpaceOnUse" x1="37.06" y1="28.5" x2="62.94" y2="99.62">
            <stop offset="0" style={{ stopColor: 'var(--brand-arc-bottom-from)' }} />
            <stop offset="1" style={{ stopColor: 'var(--brand-arc-bottom-to)' }} />
          </linearGradient>
        </defs>
        <path
          d="M61.47 27.97A14 14 0 1 0 50 50"
          fill="none"
          stroke={`url(#${topId})`}
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M50 50A14 14 0 1 1 38.53 72.03"
          fill="none"
          stroke={`url(#${bottomId})`}
          strokeWidth="12"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-card-title text-text-primary">{brand}</span>
    </div>
  )
}
