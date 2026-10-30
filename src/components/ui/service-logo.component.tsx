import { CATEGORY_COLORS, CATEGORY_TONES } from '@/constants/category-colors.constants'
import { cn } from '@/lib/utils/cn.utils'

type ServiceLogoProps = {
  name: string
  className?: string
}

/** the same name always gets the same colour, so a service is recognisable across lists */
const colorOf = (name: string) =>
  CATEGORY_COLORS[[...name].reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0) % CATEGORY_COLORS.length]

// Figma «Saldo» → ServiceLogo 2:7882 (40, radius logo-md) in its LetterAvatar form: brand images do not ship with the
// app, so the first letter of the service on a colour picked from its name stands in for the logo
export function ServiceLogo({ name, className }: ServiceLogoProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-logo-md text-body font-semibold',
        CATEGORY_TONES[colorOf(name.trim())],
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}
