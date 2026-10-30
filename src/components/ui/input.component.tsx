import { Input as InputPrimitive } from '@base-ui/react/input'
import { cn } from '@/lib/utils/cn.utils'

type InputProps = Omit<InputPrimitive.Props, 'className'> & { className?: string }

// Figma «Saldo» → Input 2:7627, frame «Field» 48 high, padding 0 16: Default / Focus (2px primary) / Error (aria-invalid) / Disabled
export function Input({ className, ...props }: InputProps) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        'h-12 w-full min-w-0 rounded-md border border-border-strong bg-card px-4 text-body text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary aria-invalid:border-negative aria-invalid:ring-negative disabled:cursor-not-allowed disabled:bg-subtle disabled:text-text-tertiary',
        className,
      )}
      {...props}
    />
  )
}
