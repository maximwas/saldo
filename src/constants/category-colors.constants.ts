/** token names of --color-cat-*; the same list as the accounts_color_check / categories_color_check constraints */
export const CATEGORY_COLORS = [
  'blue',
  'green',
  'orange',
  'pink',
  'purple',
  'teal',
  'yellow',
  'red',
  'cyan',
  'lime',
  'brown',
  'sand',
  'olive',
  'forest',
  'indigo',
  'violet',
  'magenta',
  'wine',
  'slate',
  'graphite',
] as const

export type CategoryColor = (typeof CATEGORY_COLORS)[number]

// class names spelled out so Tailwind sees every one
/** a tile: soft background, base-colour icon (Figma CategoryIcon) */
export const CATEGORY_TONES: Record<CategoryColor, string> = {
  blue: 'bg-cat-blue-soft text-cat-blue',
  green: 'bg-cat-green-soft text-cat-green',
  orange: 'bg-cat-orange-soft text-cat-orange',
  pink: 'bg-cat-pink-soft text-cat-pink',
  purple: 'bg-cat-purple-soft text-cat-purple',
  teal: 'bg-cat-teal-soft text-cat-teal',
  yellow: 'bg-cat-yellow-soft text-cat-yellow',
  red: 'bg-cat-red-soft text-cat-red',
  cyan: 'bg-cat-cyan-soft text-cat-cyan',
  lime: 'bg-cat-lime-soft text-cat-lime',
  brown: 'bg-cat-brown-soft text-cat-brown',
  sand: 'bg-cat-sand-soft text-cat-sand',
  olive: 'bg-cat-olive-soft text-cat-olive',
  forest: 'bg-cat-forest-soft text-cat-forest',
  indigo: 'bg-cat-indigo-soft text-cat-indigo',
  violet: 'bg-cat-violet-soft text-cat-violet',
  magenta: 'bg-cat-magenta-soft text-cat-magenta',
  wine: 'bg-cat-wine-soft text-cat-wine',
  slate: 'bg-cat-slate-soft text-cat-slate',
  graphite: 'bg-cat-graphite-soft text-cat-graphite',
}

/** a letter avatar: soft background, the colour's text shade (Figma LetterAvatar 2:7963) */
export const CATEGORY_LETTER_TONES: Record<CategoryColor, string> = {
  blue: 'bg-cat-blue-soft text-cat-blue-text',
  green: 'bg-cat-green-soft text-cat-green-text',
  orange: 'bg-cat-orange-soft text-cat-orange-text',
  pink: 'bg-cat-pink-soft text-cat-pink-text',
  purple: 'bg-cat-purple-soft text-cat-purple-text',
  teal: 'bg-cat-teal-soft text-cat-teal-text',
  yellow: 'bg-cat-yellow-soft text-cat-yellow-text',
  red: 'bg-cat-red-soft text-cat-red-text',
  cyan: 'bg-cat-cyan-soft text-cat-cyan-text',
  lime: 'bg-cat-lime-soft text-cat-lime-text',
  brown: 'bg-cat-brown-soft text-cat-brown-text',
  sand: 'bg-cat-sand-soft text-cat-sand-text',
  olive: 'bg-cat-olive-soft text-cat-olive-text',
  forest: 'bg-cat-forest-soft text-cat-forest-text',
  indigo: 'bg-cat-indigo-soft text-cat-indigo-text',
  violet: 'bg-cat-violet-soft text-cat-violet-text',
  magenta: 'bg-cat-magenta-soft text-cat-magenta-text',
  wine: 'bg-cat-wine-soft text-cat-wine-text',
  slate: 'bg-cat-slate-soft text-cat-slate-text',
  graphite: 'bg-cat-graphite-soft text-cat-graphite-text',
}

/** a swatch of the colour picker */
export const CATEGORY_SWATCHES: Record<CategoryColor, string> = {
  blue: 'bg-cat-blue',
  green: 'bg-cat-green',
  orange: 'bg-cat-orange',
  pink: 'bg-cat-pink',
  purple: 'bg-cat-purple',
  teal: 'bg-cat-teal',
  yellow: 'bg-cat-yellow',
  red: 'bg-cat-red',
  cyan: 'bg-cat-cyan',
  lime: 'bg-cat-lime',
  brown: 'bg-cat-brown',
  sand: 'bg-cat-sand',
  olive: 'bg-cat-olive',
  forest: 'bg-cat-forest',
  indigo: 'bg-cat-indigo',
  violet: 'bg-cat-violet',
  magenta: 'bg-cat-magenta',
  wine: 'bg-cat-wine',
  slate: 'bg-cat-slate',
  graphite: 'bg-cat-graphite',
}

/** no colour = neutral (Figma CategoryIcon Color=neutral) */
export const NEUTRAL_TONE = 'bg-subtle text-text-secondary'
