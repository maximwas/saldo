import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { useId } from 'react'
import { cn } from '@/lib/utils/cn.utils'

type SwitchProps = {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  name?: string
  className?: string
}

// Figma «Saldo» → Switch 2:9645: row 44 high, label left, track 44x24 (padding 2) right, knob 20 with shadow-card;
// Off border-strong, On primary, Disabled border. The wrapping label makes the whole row a click target and the name.
export function Switch({ label, checked, onCheckedChange, disabled, name, className }: SwitchProps) {
  const switchId = useId()

  return (
    <label
      htmlFor={switchId}
      className={cn(
        'flex h-11 items-center gap-3 text-body',
        disabled ? 'cursor-not-allowed text-text-tertiary' : 'cursor-pointer text-text-primary',
        className,
      )}
    >
      <span className="flex-1">{label}</span>
      <SwitchPrimitive.Root
        id={switchId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        name={name}
        className="flex h-6 w-11 shrink-0 items-center rounded-full bg-border-strong p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card data-checked:bg-primary data-disabled:bg-border"
      >
        <SwitchPrimitive.Thumb className="size-5 rounded-full bg-card shadow-card transition-transform data-checked:translate-x-5" />
      </SwitchPrimitive.Root>
    </label>
  )
}
