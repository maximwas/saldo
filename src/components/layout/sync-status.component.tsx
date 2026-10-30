import { CircleCheck, CloudOff, Copy, RefreshCw, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils/cn.utils'

type SyncState = 'synced' | 'pending' | 'error' | 'offline' | 'conflict'

// Figma «Saldo» → SyncStatus 2:11328, Platform=Sidebar (the only one the shell uses so far)
const STATES = {
  synced: {
    icon: CircleCheck,
    iconClass: 'text-positive',
    boxClass: 'text-text-secondary',
  },
  pending: {
    icon: RefreshCw,
    iconClass: 'text-primary',
    boxClass: 'text-text-secondary',
  },
  error: {
    icon: TriangleAlert,
    iconClass: 'text-warning',
    boxClass: 'bg-warning-soft text-warning-text',
  },
  offline: {
    icon: CloudOff,
    iconClass: 'text-text-secondary',
    boxClass: 'bg-subtle text-text-secondary',
  },
  conflict: {
    icon: Copy,
    iconClass: 'text-warning',
    boxClass: 'bg-warning-soft text-warning-text',
  },
} as const

type SyncStatusProps = {
  state: SyncState
  /** e.g. synced at 14:32, pending with 2 changes */
  label: string
  /** retry for error, review for conflict */
  action?: React.ReactNode
  className?: string
}

export function SyncStatus({ state, label, action, className }: SyncStatusProps) {
  const { icon: Icon, iconClass, boxClass } = STATES[state]

  return (
    <span role="status" className={cn('flex h-9 items-center gap-2 rounded-md px-3', boxClass, className)}>
      {/* Figma keeps a 2px stroke at 16px */}
      <Icon aria-hidden size={16} nonScalingStroke className={cn('shrink-0', iconClass)} />
      <span className="flex-1 truncate text-caption">{label}</span>
      {action && <span className="text-caption font-medium">{action}</span>}
    </span>
  )
}
