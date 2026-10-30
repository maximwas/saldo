'use client'

import { motion } from 'motion/react'
import { useId } from 'react'
import { cn } from '@/lib/utils/cn.utils'

type SegmentedOption<Value extends string> = {
  value: Value
  label: string
  /** set when the label is in another language than the page (a language switcher) */
  lang?: string
}

type SegmentedControlProps<Value extends string> = {
  label: string
  options: readonly SegmentedOption<Value>[]
  value: Value
  onValueChange: (value: Value) => void
  /** disables the options and marks the group busy while a change is saved */
  pending?: boolean
}

// Figma «Saldo» → SegmentedControl 2:7681: track subtle, padding 4, gap 4, radius md; the selected option is a card
// with shadow-card and label-semibold, the rest label-medium in text-secondary; options are 36 high, padding 8/16.
// The card is one shared-layout pill (layoutId per instance), so it slides between options instead of jumping.
export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onValueChange,
  pending = false,
}: SegmentedControlProps<Value>) {
  const pillId = useId()

  return (
    <fieldset aria-label={label} aria-busy={pending} className="flex w-fit items-center gap-1 rounded-md bg-subtle p-1">
      {options.map((option) => {
        const selected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            lang={option.lang}
            aria-pressed={selected}
            disabled={pending}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'relative flex items-center justify-center rounded-logo-md px-4 py-2 text-label outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary',
              selected ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary',
            )}
          >
            {selected ? (
              <motion.span
                layoutId={pillId}
                aria-hidden
                className="absolute inset-0 rounded-logo-md bg-card shadow-card"
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </fieldset>
  )
}
