import {
  Banknote,
  Briefcase,
  Bus,
  Car,
  Coffee,
  CreditCard,
  Gift,
  HeartPulse,
  House,
  Landmark,
  type LucideIcon,
  Package,
  PiggyBank,
  Plane,
  Repeat,
  ShoppingBasket,
  Tag,
} from 'lucide-react'
import type { CategoryColor } from '@/constants/category-colors.constants'
import { cn } from '@/lib/utils/cn.utils'

// lucide names as Figma «Saldo» Icon/<name>; `icon` columns of accounts and categories hold one of these keys
const ICONS = {
  'credit-card': CreditCard,
  banknote: Banknote,
  'piggy-bank': PiggyBank,
  house: House,
  'shopping-basket': ShoppingBasket,
  coffee: Coffee,
  bus: Bus,
  car: Car,
  repeat: Repeat,
  'heart-pulse': HeartPulse,
  package: Package,
  plane: Plane,
  landmark: Landmark,
  tag: Tag,
  gift: Gift,
  briefcase: Briefcase,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS

export const ICON_NAMES = Object.keys(ICONS) as IconName[]

// class names spelled out so Tailwind sees every one; no colour = neutral (Figma CategoryIcon Color=neutral)
const TONES: Record<CategoryColor | 'neutral', string> = {
  blue: 'bg-cat-blue-soft text-cat-blue',
  cyan: 'bg-cat-cyan-soft text-cat-cyan',
  green: 'bg-cat-green-soft text-cat-green',
  lime: 'bg-cat-lime-soft text-cat-lime',
  orange: 'bg-cat-orange-soft text-cat-orange',
  pink: 'bg-cat-pink-soft text-cat-pink',
  purple: 'bg-cat-purple-soft text-cat-purple',
  red: 'bg-cat-red-soft text-cat-red',
  teal: 'bg-cat-teal-soft text-cat-teal',
  yellow: 'bg-cat-yellow-soft text-cat-yellow',
  neutral: 'bg-subtle text-text-secondary',
}

type CategoryIconProps = {
  /** a key of ICONS; anything else (an old value, null) shows the tag */
  icon: string | null
  color: string | null
  /** 40 for a row, 32 for a subcategory (Figma CategoryIcon Size=40 / 32) */
  size?: 'md' | 'sm'
  className?: string
}

export function CategoryIcon({ icon, color, size = 'md', className }: CategoryIconProps) {
  const Icon = ICONS[icon as IconName] ?? Tag
  const tone = TONES[color as CategoryColor] ?? TONES.neutral

  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        size === 'md' ? 'size-10' : 'size-8',
        tone,
        className,
      )}
    >
      <Icon className={size === 'md' ? 'size-5' : 'size-4'} />
    </span>
  )
}
