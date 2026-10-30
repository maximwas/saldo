import { cloneElement, useId } from 'react'
import { cn } from '@/lib/utils/cn.utils'

/** props Field injects into its single child; every form control in this folder accepts them */
export type FieldControlProps = {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

type FieldProps = {
  label: string
  hint?: string
  /** replaces the hint and turns the control red */
  error?: string
  className?: string
  children: React.ReactElement<FieldControlProps>
}

// Figma «Saldo» → Input / Select / DateField frames: column, gap 6, label text-label-medium in text-secondary, hint
// text-caption in text-tertiary (negative-text in the Error state)
export function Field({ label, hint, error, className, children }: FieldProps) {
  const controlId = useId()
  const messageId = useId()
  const message = error ?? hint

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={controlId} className="text-label font-medium text-text-secondary">
        {label}
      </label>
      {/* cloneElement: the control stays a plain element, no context needed for three attributes */}
      {cloneElement(children, {
        id: controlId,
        'aria-describedby': message ? messageId : undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {message ? (
        <p
          id={messageId}
          role={error ? 'alert' : undefined}
          className={cn('text-caption', error ? 'text-negative-text' : 'text-text-tertiary')}
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}
