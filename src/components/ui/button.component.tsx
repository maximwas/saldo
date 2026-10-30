import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn.utils'

// Figma «Saldo» → Button 2:7604 (Variant × Size × State); gap 2 and icon 20 from the «Додати» instance in Topbar 2:8171.
// Only Secondary (and Danger on hover) has a 1px border in Figma; disabled drops it.
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:border-transparent disabled:bg-subtle disabled:text-text-tertiary',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary enabled:hover:bg-primary-hover',
        secondary: 'border border-border-strong bg-card text-text-primary enabled:hover:bg-subtle',
        ghost: 'text-primary-text enabled:hover:bg-primary-soft',
        danger: 'border border-transparent bg-negative-soft text-negative-text enabled:hover:border-negative',
      },
      size: {
        m: 'h-11 px-5 text-body',
        s: 'h-9 px-3 text-label',
      },
    },
    defaultVariants: { variant: 'primary', size: 'm' },
  },
)

type ButtonProps = Omit<ButtonPrimitive.Props, 'className'> &
  VariantProps<typeof buttonVariants> & { className?: string }

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
