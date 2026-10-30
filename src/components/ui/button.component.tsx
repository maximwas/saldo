import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn.utils'

// Figma «Saldo» → Button 2:7604 (Variant × Size × State)
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent font-medium transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:pointer-events-none disabled:border-transparent disabled:bg-subtle disabled:text-text-tertiary',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary hover:bg-primary-hover',
        secondary: 'border-border-strong bg-card text-text-primary hover:bg-subtle',
        ghost: 'text-primary-text hover:bg-primary-soft',
        danger: 'bg-negative-soft text-negative-text hover:border-negative',
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
