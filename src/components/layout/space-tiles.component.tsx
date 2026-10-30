import type { Route } from 'next'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { SPACE_TILES } from '@/constants/navigation.constants'
import { cn } from '@/lib/utils/cn.utils'

// Figma «Saldo» → "Menu C · Space" 11:73245: 2 columns, gap 8; tile 60 high, icon in a 32 circle, pressed = primary-soft.
// shortcut: the Figma attention dot on Credits waits for the credits data
export function SpaceTiles() {
  const translate = useTranslations('shell')

  return (
    <>
      <h2 className="text-caption font-medium text-text-tertiary uppercase">{translate('space.sections')}</h2>
      <nav aria-label={translate('space.sections')} className="grid grid-cols-2 gap-2">
        {SPACE_TILES.map(({ key, href, icon: Icon, tone }) => (
          <Link
            key={key}
            href={href as Route}
            className="flex h-15 min-w-0 cursor-pointer items-center gap-3 rounded-inner bg-card px-3 text-label font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary active:bg-primary-soft active:font-semibold active:text-primary-text"
          >
            <span aria-hidden className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', tone)}>
              <Icon size={16} />
            </span>
            <span className="truncate">{translate(`space.tiles.${key}`)}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
