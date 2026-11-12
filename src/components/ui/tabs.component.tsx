'use client'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { Activity, useState } from 'react'

type TabsProps<Value extends string> = {
  label: string
  options: readonly {
    value: Value
    label: string
    /** the tab's content when the tabs hold it (a Base UI Panel); without it the tabs only switch */
    panel?: React.ReactNode
  }[]
  value: Value
  onValueChange: (value: Value) => void
}

// Figma «Saldo» → Tabs 2:7682: gap 24 over a 1px border-bottom; Tab = label body-medium (text-primary when active,
// else text-secondary), padding 10/4/0, gap 10, a 2px primary indicator under the active one
export function Tabs<Value extends string>({ label, options, value, onValueChange }: TabsProps<Value>) {
  // a panel stays mounted once opened, hidden under <Activity>: a half-filled form (subscription settings) survives a
  // switch to another tab, and a panel nobody opened is never rendered
  const [opened, setOpened] = useState<ReadonlySet<Value>>(() => new Set([value]))

  if (!opened.has(value)) {
    setOpened(new Set(opened).add(value))
  }

  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={(next) => onValueChange(next as Value)}
      className="flex flex-col gap-4 lg:gap-6"
    >
      <TabsPrimitive.List aria-label={label} className="flex items-end gap-6 border-b border-border">
        {options.map((option) => (
          <TabsPrimitive.Tab
            key={option.value}
            value={option.value}
            className="group flex cursor-pointer flex-col items-center gap-2.5 rounded-xs px-1 pt-2.5 text-body font-medium text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary data-active:text-text-primary"
          >
            {option.label}
            <span className="h-0.5 self-stretch rounded-full group-data-active:bg-primary" />
          </TabsPrimitive.Tab>
        ))}
      </TabsPrimitive.List>
      {options.map((option) =>
        option.panel === undefined || !opened.has(option.value) ? null : (
          <TabsPrimitive.Panel
            key={option.value}
            value={option.value}
            keepMounted
            className="flex flex-col gap-4 outline-none lg:gap-6"
          >
            <Activity mode={option.value === value ? 'visible' : 'hidden'}>{option.panel}</Activity>
          </TabsPrimitive.Panel>
        ),
      )}
    </TabsPrimitive.Root>
  )
}
