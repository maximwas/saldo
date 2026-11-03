import { describe, expect, it } from 'vitest'
import { avatarFileProblem } from './avatar-file.utils'

const MEGABYTE = 1024 * 1024

describe('avatarFileProblem', () => {
  it('accepts a JPG, PNG or WebP up to 10 MB', () => {
    expect(
      avatarFileProblem({
        size: 10 * MEGABYTE,
        type: 'image/jpeg',
      }),
    ).toBeNull()
    expect(
      avatarFileProblem({
        size: 200_000,
        type: 'image/png',
      }),
    ).toBeNull()
    expect(
      avatarFileProblem({
        size: 200_000,
        type: 'image/webp',
      }),
    ).toBeNull()
  })

  it('names the size of a photo over 10 MB, rounded up to a tenth', () => {
    expect(
      avatarFileProblem({
        size: 24 * MEGABYTE,
        type: 'image/jpeg',
      }),
    ).toEqual({
      kind: 'tooBig',
      sizeMb: 24,
    })
    expect(
      avatarFileProblem({
        size: 10 * MEGABYTE + 1,
        type: 'image/png',
      }),
    ).toEqual({
      kind: 'tooBig',
      sizeMb: 10.1,
    })
  })

  it('refuses anything that is not a JPG, PNG or WebP before its size', () => {
    expect(
      avatarFileProblem({
        size: 30 * MEGABYTE,
        type: 'application/pdf',
      }),
    ).toEqual({
      kind: 'notImage',
    })
    expect(
      avatarFileProblem({
        size: 1000,
        type: 'image/gif',
      }),
    ).toEqual({
      kind: 'notImage',
    })
  })
})
