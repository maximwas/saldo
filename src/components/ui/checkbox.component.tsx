import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn.utils'

type CheckboxProps = Omit<CheckboxPrimitive.Root.Props, 'className'> & { className?: string }

// Figma «Saldo» → Checkbox (the Pin of the rates rows, 50:123386): a 20 box, radius xs; Off border-strong on card, On primary
// with a 16 check in on-primary. Wrap it in a <label> with its text, so the whole row is the 44 high target
export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-xs border border-border-strong bg-card text-on-primary outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card data-checked:border-primary data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:border-border data-disabled:bg-subtle',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check aria-hidden className="size-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
