import { Archive, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Toaster as SonnerToaster, toast } from 'sonner'
import { cn } from '@/lib/utils/cn.utils'

type ToastKind = 'success' | 'error' | 'info' | 'undo'

type ToastCardProps = {
  id: string | number
  kind: ToastKind
  text: string
  /** Error: «Retry»; Undo: «Undo» */
  onAction?: () => void
}

const ICONS = {
  success: {
    Icon: CircleCheck,
    tone: 'text-positive-text',
  },
  error: {
    Icon: TriangleAlert,
    tone: 'text-negative-text',
  },
  info: {
    Icon: Info,
    tone: 'text-primary-text',
  },
  undo: {
    Icon: Archive,
    tone: 'text-text-secondary',
  },
} as const

// Figma «Saldo» → Toast 2:10077: 400 wide, padding 12/12/12/16, gap 12, radius inner, raised + shadow-float, 20px icon,
// text body-medium, optional action label-semibold in primary-text, 28px close with a 16px icon.
// A custom sonner toast keeps this layout exact; sonner still owns stacking, timers, swipe and the live region.
function ToastCard({ id, kind, text, onAction }: ToastCardProps) {
  const translate = useTranslations('common')
  const { Icon, tone } = ICONS[kind]
  const actionLabel = kind === 'error' ? translate('toast.retry') : translate('toast.undo')

  return (
    <div className="flex w-full items-center gap-3 rounded-inner bg-raised py-3 pr-3 pl-4 shadow-float sm:w-100">
      <Icon className={cn('size-5 shrink-0', tone)} aria-hidden />
      <p className="flex-1 text-body font-medium text-text-primary">{text}</p>
      {onAction ? (
        <button
          type="button"
          onClick={() => {
            onAction()
            toast.dismiss(id)
          }}
          className="cursor-pointer rounded-sm px-1 text-label font-semibold text-primary-text outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {actionLabel}
        </button>
      ) : null}
      <button
        type="button"
        aria-label={translate('close')}
        onClick={() => toast.dismiss(id)}
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-text-secondary outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}

const show = (kind: ToastKind, text: string, onAction?: () => void) =>
  toast.custom((id) => <ToastCard id={id} kind={kind} text={text} onAction={onAction} />)

/** one helper for every screen: `notify.success(translate('saved'))`, `notify.error(msg, { onRetry })`, `notify.undo(msg, { onUndo })` */
export const notify = {
  success: (text: string) => show('success', text),
  info: (text: string) => show('info', text),
  error: (text: string, options?: { onRetry?: () => void }) => show('error', text, options?.onRetry),
  undo: (text: string, options: { onUndo: () => void }) => show('undo', text, options.onUndo),
}

/** mounted once in AppProviders; bottom-centre like Figma, lifted above the mobile tab bar */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      mobileOffset={{
        bottom: 'calc(var(--tabbar-h) + 0.75rem)',
        left: '1rem',
        right: '1rem',
      }}
      toastOptions={{ unstyled: true }}
    />
  )
}
