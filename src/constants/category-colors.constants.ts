/** token names of --color-cat-*; the same list as the accounts_color_check / categories_color_check constraints */
export const CATEGORY_COLORS = [
  'blue',
  'cyan',
  'green',
  'lime',
  'orange',
  'pink',
  'purple',
  'red',
  'teal',
  'yellow',
] as const

export type CategoryColor = (typeof CATEGORY_COLORS)[number]
