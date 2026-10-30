import {
  ArrowLeftRight,
  CalendarClock,
  CalendarDays,
  Car,
  ChartColumn,
  Ellipsis,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Wallet,
} from 'lucide-react'
import type { Messages } from 'next-intl'

/** a key of messages/<locale>/nav.json */
export type NavKey = keyof Messages['nav']
/** href is a plain string: typed routes only see the stub catch-all, so <Link> casts it to Route */
export type NavLink = { key: NavKey; href: string }
export type NavSection = NavLink & { icon: LucideIcon; children?: readonly NavLink[] }

const link = (key: NavKey, href: string): NavLink => ({ key, href })
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

/** mobile TabBar: overview, operations, calendar, payments, more (spec §2) */
export const MORE_SECTION = section('more', '/more', Ellipsis)
export const TAB_BAR_SECTIONS = [overview, operations, calendar, payments, MORE_SECTION] as const
/** the More page lists these */
export const MORE_SECTIONS = [budget, auto, taxes, statistics, settings] as const

/** pages outside the menu that still need a Topbar title */
export const EXTRA_TITLES: readonly NavLink[] = [link('notifications', '/notifications'), link('more', '/more')]
