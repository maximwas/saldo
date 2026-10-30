import { createCn } from 'cn/config'

// theme.css replaces Tailwind's scales with named tokens; without them `cn('text-label', 'text-text-primary')`
// would treat the size as a colour and drop it
export const cn = createCn({
  extend: {
    theme: {
      text: ['hero', 'page-title', 'number', 'number-sm', 'card-title', 'body', 'label', 'caption', 'micro'],
      radius: ['logo-md', 'inner', 'card'],
      shadow: ['card', 'float'],
    },
  },
})
