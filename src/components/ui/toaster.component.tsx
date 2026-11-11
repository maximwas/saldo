import { Archive, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Toaster as SonnerToaster, toast } from 'sonner'
import { cn } from '@/lib/utils/cn.utils'

type ToastKind = 'success' | 'error' | 'info' | 'undo'

type ToastCardProps = {
  id: string | number
  kind: ToastKind
  text: string
  /** Error: «Retry»; Undo: «Undo»; Success: its own label, e.g. «Show» the day a payment went to */
  onAction?: () => void
  actionLabel?: string
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
function ToastCard({ id, kind, text, onAction, actionLabel }: ToastCardProps) {
  const translate = useTranslations('common')
  const { Icon, tone } = ICONS[kind]
  const label = actionLabel ?? (kind === 'error' ? translate('toast.retry') : translate('toast.undo'))

  return (
    // the 20 icon, the action and the 28 ✕ sit on the first 24px line, however many lines the text takes
    <div className="flex w-full items-start gap-3 rounded-inner bg-raised py-3 pr-3 pl-4 shadow-float sm:w-100">
      <span className="flex shrink-0 py-0.5">
        <Icon className={cn('size-5', tone)} aria-hidden />
      </span>
      <p className="flex-1 text-body font-medium text-text-primary">{text}</p>
      {onAction ? (
        <button
          type="button"
          onClick={() => {
            onAction()
            toast.dismiss(id)
          }}
          className="cursor-pointer rounded-sm px-1 py-0.5 text-label font-semibold text-primary-text outline-none transition-colors hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary"
        >
          {label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label={translate('close')}
        onClick={() => toast.dismiss(id)}
        className="-my-0.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-text-secondary outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}

type ToastAction = {
  label: string
  onAction: () => void
}

// a toast with an action («Show», «Undo», «Retry») stays 10 s: sonner's 4 s was gone before a phone tap (QA2 #19)
const ACTION_DURATION = 10_000

const show = (kind: ToastKind, text: string, onAction?: () => void, actionLabel?: string) =>
  toast.custom((id) => <ToastCard id={id} kind={kind} text={text} onAction={onAction} actionLabel={actionLabel} />, {
    duration: onAction ? ACTION_DURATION : undefined,
  })

/** one helper for every screen: `notify.success(translate('saved'))`, `notify.success(msg, { label, onAction })`,
 * `notify.error(msg, { onRetry })`, `notify.undo(msg, { onUndo })` */
export const notify = {
  success: (text: string, action?: ToastAction) => show('success', text, action?.onAction, action?.label),
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
