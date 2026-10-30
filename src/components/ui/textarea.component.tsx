import { cn } from '@/lib/utils/cn.utils'

type TextareaProps = Omit<React.ComponentProps<'textarea'>, 'className'> & { className?: string }

// Figma «Saldo» → Textarea 2:9609: field 104 high, padding 12/16, Default / Focus (2px primary) / Error (1px negative)
// / Disabled (subtle fill)
export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-26 w-full resize-y rounded-md border border-border-strong bg-card px-4 py-3 text-body text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary aria-invalid:border-negative aria-invalid:focus-visible:ring-negative disabled:cursor-not-allowed disabled:bg-subtle disabled:text-text-tertiary',
        className,
      )}
      {...props}
    />
  )
}
