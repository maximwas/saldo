'use client'

import { motion } from 'motion/react'
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
  /** undefined while the value is not known yet (a client-only preference before hydration) */
  value: Value | undefined
  onValueChange: (value: Value) => void
  /** disables the options and marks the group busy while a change is saved */
  pending?: boolean
  /** the value cannot change now: say why next to the control */
  disabled?: boolean
  /** below lg the control fills its row and the options share it (Figma mobile list rows); natural width from lg */
  stretch?: boolean
}

// Figma «Saldo» → SegmentedControl 2:7681: track subtle, padding 4, gap 4, radius md; the selected option is a card
// with shadow-card and label-semibold, the rest label-medium in text-secondary; options are 36 high, padding 8/16.
// Hover is text-primary on the border-strong fill and a press shrinks the option a little: Figma's border fill was
// too close to the track to see (Maxim 12.11: hover had no visible effect).
// The card is one pill in the selected option's grid cell under the labels: a motion layout animation slides it to the
// next cell relative to the fieldset (layout + layoutRoot: the fieldset snaps to its new place, its children animate
// against it), so a fieldset that moves with a resizing sheet doesn't drag the pill from its old screen position, as
// the layoutId pill remounted in the next option did (Maxim 3.11).
export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onValueChange,
  pending = false,
  disabled = false,
  stretch = false,
}: SegmentedControlProps<Value>) {
  const selectedColumn = options.findIndex((option) => option.value === value) + 1

  return (
    <motion.fieldset
      layout
      layoutRoot
      aria-label={label}
      aria-busy={pending}
      className={cn(
        'grid grid-flow-col items-center gap-1 rounded-md bg-subtle p-1',
        stretch ? 'w-full auto-cols-fr lg:w-fit lg:auto-cols-auto' : 'w-fit',
      )}
    >
      {selectedColumn > 0 ? (
        <motion.span
          layout
          aria-hidden
          className="row-start-1 self-stretch rounded-logo-md bg-card shadow-card"
          style={{ gridColumnStart: selectedColumn }}
        />
      ) : null}
      {options.map((option, index) => {
        const selected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            lang={option.lang}
            aria-pressed={selected}
            disabled={pending || disabled}
            onClick={() => onValueChange(option.value)}
            style={{ gridColumnStart: index + 1 }}
            className={cn(
              'relative row-start-1 flex cursor-pointer items-center justify-center rounded-logo-md py-2 text-label outline-none transition after:absolute after:-inset-y-1 after:inset-x-0 focus-visible:ring-2 focus-visible:ring-primary enabled:active:scale-95 disabled:cursor-not-allowed',
              stretch ? 'min-w-0 px-2 lg:px-4' : 'px-4',
              selected
                ? 'font-semibold text-text-primary'
                : 'font-medium text-text-secondary enabled:hover:bg-border-strong enabled:hover:text-text-primary',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </motion.fieldset>
  )
}
