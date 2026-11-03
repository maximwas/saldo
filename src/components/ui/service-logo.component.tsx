import Image from 'next/image'
import { CATEGORY_LETTER_TONES, type CategoryColor } from '@/constants/category-colors.constants'
import { cn } from '@/lib/utils/cn.utils'
import { letterColorOf, serviceLogoIsInset, serviceLogoOf } from './service-logo.utils'

type ServiceLogoProps = {
  name: string
  /** px: 40 in lists and cards, 32 in table rows, 24 in fields */
  size?: 40 | 32 | 24
  className?: string
}

const SIZES = {
  40: {
    box: 'size-10 rounded-md',
    letter: 'text-body font-semibold',
  },
  32: {
    box: 'size-8 rounded-logo-md',
    letter: 'text-label font-semibold',
  },
  24: {
    box: 'size-6 rounded-sm',
    letter: 'text-micro',
  },
} as const

type LetterAvatarProps = {
  name: string
  size?: ServiceLogoProps['size']
  /** shown instead of the first letter of the name: a currency symbol («$», «zł») */
  letter?: string
  /** instead of the colour of the name: the rate rows colour by their place (Figma 50:122598) */
  color?: CategoryColor
  className?: string
}

// Figma «Saldo» → LetterAvatar 2:7963: the first letter in cat-<colour>-text on the soft fill; the colour follows the
// name, so a person or a service looks the same everywhere
export function LetterAvatar({ name, size = 40, letter, color, className }: LetterAvatarProps) {
  const { box, letter: letterClass } = SIZES[size]

  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center',
        box,
        letterClass,
        CATEGORY_LETTER_TONES[color ?? letterColorOf(name.trim())],
        className,
      )}
    >
      {letter ?? name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

// Figma «Saldo» → ServiceLogo 2:7882 (40/32/24, radius md/logo-md/sm, white fill in both themes
// (cat-on, Maxim 3.11: transparent logos like Spotify vanished on the dark card), the logo from Service logos 1:167, no
// border ring: Maxim, 3.11); a name without a logo gets LetterAvatar 2:7963: its first letter in cat-<colour>-text on the soft fill
export function ServiceLogo({ name, size = 40, className }: ServiceLogoProps) {
  const logo = serviceLogoOf(name)
  const { box } = SIZES[size]

  if (logo) {
    return (
      <span aria-hidden className={cn('relative shrink-0 overflow-hidden bg-cat-on', box, className)}>
        <Image src={logo} alt="" fill unoptimized className={serviceLogoIsInset(name) ? 'p-1.5' : undefined} />
      </span>
    )
  }

  return <LetterAvatar name={name} size={size} className={className} />
}
