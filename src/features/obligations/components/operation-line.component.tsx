import { Amount } from '@/components/ui/amount.component'
import { ServiceLogo } from '@/components/ui/service-logo.component'

type OperationLineProps = {
  title: string
  subtitle: string
  /** signed: an expense is negative */
  minor: number
  currency: string
  /** the row's own button, e.g. «Link» */
  action?: React.ReactNode
}

// Figma «Saldo» → Confirm payment 2:15508 / Cancel payment 5:91761: ListItem of an operation, ServiceLogo 40, title
// body-medium, subtitle «date · account» in label, a Fact Amount on the right and, when given, a Secondary S button;
// padding 12/0, gap 16
export function OperationLine({ title, subtitle, minor, currency, action }: OperationLineProps) {
  return (
    <li className="flex items-center gap-4 py-3">
      <ServiceLogo name={title} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-body font-medium text-text-primary">{title}</span>
        <span className="text-label text-text-secondary">{subtitle}</span>
      </span>
      <Amount minor={minor} currency={currency} />
      {action}
    </li>
  )
}
