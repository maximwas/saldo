import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { EmptyState } from '@/components/ui/empty-state.component'

type ErrorStateProps = {
  /** "Could not load <screen>": the screen's own loadFailed */
  title: string
  /** useScreenQueryState's retry: refetches the failed queries */
  onRetryAction: () => void
}

// Figma «Saldo» → ErrorState 39:105538, the sibling of EmptyState 2:10027, in the «Error» card of the load-error frames
// 39:105552 (Overview 39:105553, Operations 39:106643): the red CategoryIcon with triangle-alert and a Secondary
// "Try again" with refresh-cw. Only for useScreenQueryState's failedLoad; a failed refresh over cached data is a toast.
export function ErrorState({ title, onRetryAction }: ErrorStateProps) {
  const translate = useTranslations('common.errorState')

  return (
    <EmptyState
      icon={TriangleAlert}
      tone="red"
      role="alert"
      title={title}
      hint={translate('hint')}
      action={
        <Button variant="secondary" onClick={() => onRetryAction()}>
          <RefreshCw aria-hidden className="size-5" />
          {translate('retry')}
        </Button>
      }
    />
  )
}
