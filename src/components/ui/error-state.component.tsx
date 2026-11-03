import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'

type ErrorStateProps = {
  /** "Could not load <screen>": the screen's own loadFailed */
  title: string
  /** the failed query's refetch (TanStack Query) */
  onRetryAction: () => void
}

// Figma «Saldo» → ErrorState 39:105538 inside the «Error» card of the load-error frames 39:105552 (Overview 39:105553,
// Operations 39:106643): the card pads 40/16 (64/32 on desktop) around a 480 column, gap 12, of the red CategoryIcon 40
// with triangle-alert, the body-semibold title, the label text and a Secondary "Try again" with refresh-cw.
// Only for a first load that failed with nothing to show; a failed refresh over cached data is a Banner and a Toast.
export function ErrorState({ title, onRetryAction }: ErrorStateProps) {
  const translate = useTranslations('common.errorState')

  return (
    <section className="flex flex-col items-center rounded-card bg-card px-4 py-10 shadow-card lg:px-8 lg:py-16">
      <div className="flex w-full max-w-120 flex-col items-center gap-3 p-2 text-center">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-negative-soft text-negative-text"
        >
          <TriangleAlert className="size-5" />
        </span>
        <div role="alert" className="flex flex-col gap-3 self-stretch">
          <h2 className="text-body font-semibold text-text-primary">{title}</h2>
          <p className="text-label text-text-secondary">{translate('hint')}</p>
        </div>
        <Button variant="secondary" onClick={() => onRetryAction()}>
          <RefreshCw aria-hidden className="size-5" />
          {translate('retry')}
        </Button>
      </div>
    </section>
  )
}
