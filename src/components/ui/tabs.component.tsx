'use client'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

type TabsProps<Value extends string> = {
  label: string
  options: readonly {
    value: Value
    label: string
  }[]
  value: Value
  onValueChange: (value: Value) => void
}

// Figma «Saldo» → Tabs 2:7682: gap 24 over a 1px border-bottom; Tab = label body-medium (text-primary when active,
// else text-secondary), padding 10/4/0, gap 10, a 2px primary indicator under the active one
export function Tabs<Value extends string>({ label, options, value, onValueChange }: TabsProps<Value>) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={(next) => onValueChange(next as Value)}>
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
    </TabsPrimitive.Root>
  )
}
