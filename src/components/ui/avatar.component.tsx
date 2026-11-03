import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'
import { CATEGORY_LETTER_TONES } from '@/constants/category-colors.constants'
import { cn } from '@/lib/utils/cn.utils'
import { letterColorOf } from './service-logo.utils'

const SIZES = {
  64: 'size-16 text-number-sm',
  40: 'size-10 text-body font-semibold',
  32: 'size-8 text-label font-semibold',
  24: 'size-6 text-micro',
  20: 'size-5 text-micro',
} as const

type AvatarProps = {
  name: string
  /** the photo (/api/avatars/…); none, still loading or failed = the first letter */
  src?: string | null
  /** px: 64 settings, 40 account card and members, 32 sidebar and previews, 24 conflicts, 20 authorship */
  size?: keyof typeof SIZES
  /** an avatar standing alone (the author of a row) is read aloud; next to the name it stays hidden */
  label?: string
  className?: string
}

// Figma «Saldo» → PhotoAvatar 59:147170 (64/40/32/24/20, a circle) with the person's photo; without one the first
// letter in cat-<colour>-text on the soft fill of the name's colour (LetterAvatar 2:7963), also round: person avatars
// are round, space and service tiles keep their rounded square (designer, 4.11)
export function Avatar({ name, src, size = 40, label, className }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={label}
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        SIZES[size],
        CATEGORY_LETTER_TONES[letterColorOf(name.trim())],
        className,
      )}
    >
      {src ? <AvatarPrimitive.Image src={src} alt="" className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback>{name.trim().charAt(0).toUpperCase()}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
