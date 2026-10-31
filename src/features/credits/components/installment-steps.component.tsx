import { cn } from '@/lib/utils/cn.utils'
import type { StepState } from '../utils/credits.utils'

type InstallmentStepsProps = {
  steps: StepState[]
}

const STEP_TONE: Record<StepState, string> = {
  paid: 'bg-positive',
  current: 'bg-primary',
  unconfirmed: 'bg-warning',
  plan: 'bg-border',
}

// Figma «Saldo» → InstallmentSteps 2:10378 / InstallmentStep 2:10383: one rounded segment per installment, paid green,
// the next one blue, date passed amber, the rest grey; the numbers next to it say the same in words
export function InstallmentSteps({ steps }: InstallmentStepsProps) {
  return (
    <div aria-hidden className="flex gap-1">
      {steps.map((step, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a segment is its position in the schedule
        <span key={index} className={cn('h-2 min-w-1 flex-1 rounded-full', STEP_TONE[step])} />
      ))}
    </div>
  )
}
