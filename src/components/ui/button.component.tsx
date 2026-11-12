import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn.utils'

// Figma «Saldo» → Button 2:7604 (Variant × Size × State); gap 2 and icon 20 from the Add instance in Topbar 2:8171.
// Only Secondary (and Danger on hover) has a 1px border in Figma; disabled drops it.
// Hover is not-disabled:, not enabled:, since :enabled never matches the <a> of a Button rendered as a Link.
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:border-transparent disabled:bg-subtle disabled:text-text-tertiary',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary not-disabled:hover:bg-primary-hover',
        secondary: 'border border-border-strong bg-card text-text-primary not-disabled:hover:bg-subtle',
        ghost: 'text-primary-text not-disabled:hover:bg-primary-soft',
        // the confirming action of a delete: solid, white on dark red in light (6.5:1), dark on light red in dark
        danger: 'bg-negative-text text-on-primary not-disabled:hover:bg-negative-text/90',
      },
      size: {
        m: 'h-11 px-5 text-body',
        // 36 high: the invisible ::after makes the tap target 44 or more. It is measured from inside the border, so a
        // secondary (bordered) button needs 6 px, not 4 (QA P10: the Pay row button and the calendar arrows were 42)
        s: 'relative h-9 px-3 text-label after:absolute after:-inset-1.5',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'm',
    },
  },
)

type ButtonProps = Omit<ButtonPrimitive.Props, 'className'> &
  VariantProps<typeof buttonVariants> & { className?: string }

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(
        buttonVariants({
          variant,
          size,
        }),
        className,
      )}
      {...props}
    />
  )
}
