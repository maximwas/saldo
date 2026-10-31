import Image from 'next/image'
import { CATEGORY_COLORS, CATEGORY_LETTER_TONES } from '@/constants/category-colors.constants'
import { cn } from '@/lib/utils/cn.utils'
import { serviceLogoIsInset, serviceLogoOf } from './service-logo.utils'

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

// the first eight presets, the LetterAvatar colours of the Figma frames (the two credits are yellow and blue on Overview 2:8326)
const LETTER_COLORS = CATEGORY_COLORS.slice(0, 8)

/** the same name always gets the same colour, so a service is recognisable across lists */
const colorOf = (name: string) =>
  LETTER_COLORS[[...name].reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0) % LETTER_COLORS.length]

type LetterAvatarProps = {
  name: string
  size?: ServiceLogoProps['size']
  className?: string
}

// Figma «Saldo» → LetterAvatar 2:7963: the first letter in cat-<colour>-text on the soft fill; the colour follows the
// name, so a person or a service looks the same everywhere
export function LetterAvatar({ name, size = 40, className }: LetterAvatarProps) {
  const { box, letter } = SIZES[size]

  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center',
        box,
        letter,
        CATEGORY_LETTER_TONES[colorOf(name.trim())],
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

// Figma «Saldo» → ServiceLogo 2:7882 (40/32/24, radius md/logo-md/sm, card fill, 1px border ring over the logo from
// Service logos 1:167); a name without a logo gets LetterAvatar 2:7963: its first letter in cat-<colour>-text on the soft fill
export function ServiceLogo({ name, size = 40, className }: ServiceLogoProps) {
  const logo = serviceLogoOf(name)
  const { box } = SIZES[size]

  if (logo) {
    return (
      <span aria-hidden className={cn('relative shrink-0 overflow-hidden bg-card', box, className)}>
        <Image src={logo} alt="" fill unoptimized className={serviceLogoIsInset(name) ? 'p-1.5' : undefined} />
        <span className={cn('absolute inset-0 border border-border', box)} />
      </span>
    )
  }

  return <LetterAvatar name={name} size={size} className={className} />
}
