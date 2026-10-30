import {
  ArrowLeftRight,
  CalendarClock,
  CalendarDays,
  Car,
  ChartColumn,
  CreditCard,
  HandCoins,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  PiggyBank,
  Repeat,
  Settings,
  Tag,
  Users,
  Wallet,
} from 'lucide-react'
import type { Messages } from 'next-intl'

/** a key of messages/<locale>/nav.json */
export type NavKey = keyof Messages['nav']
/** href is a plain string: typed routes only see the stub catch-all, so <Link> casts it to Route */
export type NavLink = {
  key: NavKey
  href: string
}
export type NavSection = NavLink & {
  icon: LucideIcon
  children?: readonly NavLink[]
}

const link = (key: NavKey, href: string): NavLink => ({
  key,
  href,
})
const section = (key: NavKey, href: string, icon: LucideIcon, children?: NavLink[]): NavSection => ({
  ...link(key, href),
  icon,
  children,
})

// spec §2; icons are the Figma Icon/<lucide-name> of Sidebar 2:11401 and TabBar 2:8207
const overview = section('overview', '/', LayoutDashboard)
const operations = section('operations', '/operations', ArrowLeftRight, [
  link('operationsAll', '/operations'),
  link('accounts', '/operations/accounts'),
  link('categories', '/operations/categories'),
])
const payments = section('payments', '/payments', CalendarClock, [
  link('paymentsUpcoming', '/payments'),
  link('subscriptions', '/payments/subscriptions'),
  link('credits', '/payments/credits'),
  link('debts', '/payments/debts'),
])
const calendar = section('calendar', '/calendar', CalendarDays)
const budget = section('budget', '/budget', Wallet, [
  link('budgetMonth', '/budget'),
  link('goals', '/budget/goals'),
  link('bigExpenses', '/budget/big-expenses'),
])
const auto = section('auto', '/auto', Car, [
  link('autoOverview', '/auto'),
  link('fuel', '/auto/fuel'),
  link('service', '/auto/service'),
  link('autoPlan', '/auto/plan'),
])
const taxes = section('taxes', '/taxes', Landmark, [
  link('taxesOverview', '/taxes'),
  link('liabilities', '/taxes/liabilities'),
  link('taxPayments', '/taxes/payments'),
  link('taxSettings', '/taxes/settings'),
])
const statistics = section('statistics', '/statistics', ChartColumn)
const settings = section('settings', '/settings', Settings)

/** desktop Sidebar, top to bottom; settings sits at the bottom, under SyncStatus */
export const SIDEBAR_SECTIONS = [overview, operations, payments, calendar, budget, auto, taxes, statistics] as const
export const SIDEBAR_FOOTER_SECTION = settings

/** mobile TabBar: overview, operations, calendar, payments, space (spec §2) */
export const SPACE_SECTION = section('space', '/space', Users)
export const TAB_BAR_SECTIONS = [overview, operations, calendar, payments, SPACE_SECTION] as const
/** the sections the TabBar has no room for: the Space tab is active on them */
export const SPACE_SECTIONS = [budget, auto, taxes, statistics, settings] as const

/** a key of messages/<locale>/shell.json → space.tiles */
type SpaceTileKey = keyof Messages['shell']['space']['tiles']
export type SpaceTile = {
  key: SpaceTileKey
  href: string
  icon: LucideIcon
  /** classes of the 32 icon circle: bg cat-<colour>-soft and the icon colour */
  tone: string
}

// Figma "Menu C · Space" 11:73245; tone strings are spelled out so Tailwind sees every class
export const SPACE_TILES: readonly SpaceTile[] = [
  {
    key: 'accounts',
    href: '/operations/accounts',
    icon: Wallet,
    tone: 'bg-cat-blue-soft text-cat-blue-text',
  },
  {
    key: 'budget',
    href: '/budget',
    icon: PiggyBank,
    tone: 'bg-cat-green-soft text-cat-green-text',
  },
  {
    key: 'subscriptions',
    href: '/payments/subscriptions',
    icon: Repeat,
    tone: 'bg-cat-pink-soft text-cat-pink-text',
  },
  {
    key: 'credits',
    href: '/payments/credits',
    icon: CreditCard,
    tone: 'bg-cat-orange-soft text-cat-orange-text',
  },
  {
    key: 'debts',
    href: '/payments/debts',
    icon: HandCoins,
    tone: 'bg-cat-yellow-soft text-cat-yellow-text',
  },
  {
    key: 'auto',
    href: '/auto',
    icon: Car,
    tone: 'bg-cat-cyan-soft text-cat-cyan-text',
  },
  {
    key: 'taxes',
    href: '/taxes',
    icon: Landmark,
    tone: 'bg-cat-teal-soft text-cat-teal-text',
  },
  {
    key: 'statistics',
    href: '/statistics',
    icon: ChartColumn,
    tone: 'bg-cat-purple-soft text-cat-purple-text',
  },
  {
    key: 'categories',
    href: '/operations/categories',
    icon: Tag,
    tone: 'bg-cat-lime-soft text-cat-lime-text',
  },
  {
    key: 'settings',
    href: '/settings',
    icon: Settings,
    tone: 'bg-subtle text-text-secondary',
  },
]

/** pages outside the menu that still need a Topbar title */
export const EXTRA_TITLES: readonly NavLink[] = [link('notifications', '/notifications'), link('space', '/space')]
