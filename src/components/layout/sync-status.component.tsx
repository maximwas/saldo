import { CircleCheck, CloudOff, Copy, RefreshCw, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils/cn.utils'

type SyncState = 'synced' | 'pending' | 'error' | 'offline' | 'conflict'

// Figma «Saldo» → SyncStatus 2:11328: the icon keeps its colour on both platforms; the Topbar pill fills synced and
// pending, which the Sidebar row leaves clear
const STATES = {
  synced: {
    icon: CircleCheck,
    iconClass: 'text-positive',
    sidebarClass: 'text-text-secondary',
    topbarClass: 'bg-subtle text-text-secondary',
  },
  pending: {
    icon: RefreshCw,
    iconClass: 'text-primary',
    sidebarClass: 'text-text-secondary',
    topbarClass: 'bg-primary-soft text-primary-text',
  },
  error: {
    icon: TriangleAlert,
    iconClass: 'text-warning',
    sidebarClass: 'bg-warning-soft text-warning-text',
    topbarClass: 'bg-warning-soft text-warning-text',
  },
  offline: {
    icon: CloudOff,
    iconClass: 'text-text-secondary',
    sidebarClass: 'bg-subtle text-text-secondary',
    topbarClass: 'bg-subtle text-text-secondary',
  },
  conflict: {
    icon: Copy,
    iconClass: 'text-warning',
    sidebarClass: 'bg-warning-soft text-warning-text',
    topbarClass: 'bg-warning-soft text-warning-text',
  },
} as const

// Sidebar: the row above Settings, 36 high, radius md, caption, icon 16; Topbar: the mobile pill, 28 high,
// radius full, caption-medium, icon 14
const PLATFORMS = {
  sidebar: {
    box: 'h-9 gap-2 rounded-md px-3',
    iconSize: 16,
    text: 'flex-1 text-caption',
  },
  topbar: {
    box: 'h-7 w-fit gap-1.5 rounded-full px-2.5',
    iconSize: 14,
    text: 'text-caption font-medium',
  },
} as const

type SyncStatusProps = {
  state: SyncState
  /** e.g. synced at 14:32, 3 changes waiting */
  label: string
  /** the Sidebar's retry for an error, resolve for a conflict */
  action?: React.ReactNode
  platform?: keyof typeof PLATFORMS
  className?: string
}

export function SyncStatus({ state, label, action, platform = 'sidebar', className }: SyncStatusProps) {
  const { icon: Icon, iconClass, sidebarClass, topbarClass } = STATES[state]
  const { box, iconSize, text } = PLATFORMS[platform]

  return (
    <span
      role="status"
      className={cn('flex items-center', box, platform === 'sidebar' ? sidebarClass : topbarClass, className)}
    >
      {/* Figma keeps a 2px stroke at 16px and 14px */}
      <Icon aria-hidden size={iconSize} nonScalingStroke className={cn('shrink-0', iconClass)} />
      <span className={cn('truncate', text)}>{label}</span>
      {action && <span className="text-caption font-medium">{action}</span>}
    </span>
  )
}
