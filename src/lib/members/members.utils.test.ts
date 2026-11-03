import { describe, expect, it } from 'vitest'
import { authorOf, memberName } from './members.utils'

const olena = {
  name: 'Олена',
  avatarUrl: null,
}
const taras = {
  name: 'taras',
  avatarUrl: '/api/avatars/u2?v=1',
}

describe('memberName', () => {
  it('takes the display name in the space', () => {
    expect(
      memberName({
        name: '  Олена ',
        email: 'olena@example.com',
      }),
    ).toBe('Олена')
  })

  it('falls back to the start of the email when the name is blank or unset', () => {
    expect(
      memberName({
        name: '  ',
        email: 'taras@example.com',
      }),
    ).toBe('taras')
    expect(
      memberName({
        name: null,
        email: 'taras@example.com',
      }),
    ).toBe('taras')
  })
})

describe('authorOf', () => {
  it('names the author in a space of two or more people', () => {
    expect(
      authorOf(
        {
          u1: olena,
          u2: taras,
        },
        'u2',
      ),
    ).toBe(taras)
  })

  it('shows nothing in a space of one, for a record with no author or an author who left', () => {
    expect(
      authorOf(
        {
          u1: olena,
        },
        'u1',
      ),
    ).toBeNull()
    expect(
      authorOf(
        {
          u1: olena,
          u2: taras,
        },
        null,
      ),
    ).toBeNull()
    expect(
      authorOf(
        {
          u1: olena,
          u2: taras,
        },
        'u3',
      ),
    ).toBeNull()
  })
})
