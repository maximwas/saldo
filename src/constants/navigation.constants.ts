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
/** href is a plain string: typed routes only see the stub catch-all, so <Link> casts it to Route */
export type NavLink = { label: string; href: string }
export type NavSection = NavLink & { icon: LucideIcon; children?: readonly NavLink[] }

const link = (label: string, href: string): NavLink => ({ label, href })
const section = (label: string, href: string, icon: LucideIcon, children?: NavLink[]): NavSection => ({
  ...link(label, href),
  icon,
  children,
})

// spec §2; icons are the Figma Icon/<lucide-name> of Sidebar 2:11401 and TabBar 2:8207
const overview = section('Огляд', '/', LayoutDashboard)
const operations = section('Операції', '/operations', ArrowLeftRight, [
  link('Усі операції', '/operations'),
  link('Рахунки', '/operations/accounts'),
  link('Категорії', '/operations/categories'),
])
const payments = section('Платежі', '/payments', CalendarClock, [
  link('Найближчі', '/payments'),
  link('Підписки', '/payments/subscriptions'),
  link('Кредити', '/payments/credits'),
  link('Особисті борги', '/payments/debts'),
])
const calendar = section('Календар', '/calendar', CalendarDays)
const budget = section('Бюджет', '/budget', Wallet, [
  link('Місяць', '/budget'),
  link('Цілі та конверти', '/budget/goals'),
  link('Великі витрати', '/budget/big-expenses'),
])
const auto = section('Авто', '/auto', Car, [
  link('Огляд', '/auto'),
  link('Заправки', '/auto/fuel'),
  link('Ремонт і обслуговування', '/auto/service'),
  link('План робіт', '/auto/plan'),
])
const taxes = section('Податки', '/taxes', Landmark, [
  link('Огляд', '/taxes'),
  link("Зобов'язання", '/taxes/liabilities'),
  link('Історія оплат', '/taxes/payments'),
  link('Налаштування', '/taxes/settings'),
])
const statistics = section('Статистика', '/statistics', ChartColumn)
const settings = section('Налаштування', '/settings', Settings)

/** desktop Sidebar, top to bottom; Налаштування sits at the bottom, under SyncStatus */
export const SIDEBAR_SECTIONS = [overview, operations, payments, calendar, budget, auto, taxes, statistics] as const
export const SIDEBAR_FOOTER_SECTION = settings

/** mobile TabBar: Огляд | Операції | Календар | Платежі | Ще */
export const MORE_SECTION = section('Ще', '/more', Ellipsis)
export const TAB_BAR_SECTIONS = [overview, operations, calendar, payments, MORE_SECTION] as const
/** the «Ще» page lists these */
export const MORE_SECTIONS = [budget, auto, taxes, statistics, settings] as const

/** pages outside the menu that still need a Topbar title */
export const EXTRA_TITLES: readonly NavLink[] = [link('Сповіщення', '/notifications'), link('Ще', '/more')]
