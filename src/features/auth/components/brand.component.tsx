import { cn } from '@/lib/utils/cn.utils'

// Figma «Saldo» → Вхід 4:79956 «Brand»
export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-logo-md bg-primary text-body font-semibold text-on-primary"
      >
        S
      </span>
      <span className="text-card-title text-text-primary">Saldo</span>
    </div>
  )
}
