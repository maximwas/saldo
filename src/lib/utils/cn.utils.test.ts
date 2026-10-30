import { expect, it } from 'vitest'
import { cn } from '@/lib/utils/cn.utils'

it('keeps a theme text size next to a text colour and merges conflicts', () => {
  expect(cn('text-label text-text-primary', 'text-caption')).toBe('text-text-primary text-caption')
  expect(cn('rounded-md shadow-card', 'rounded-card shadow-float')).toBe('rounded-card shadow-float')
})
