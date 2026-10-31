import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { issueKey } from './issue-key.utils'

const schema = z.object({
  accountId: z.uuid(),
  email: z.email(),
  name: z.string().min(2).max(5),
  count: z.int().min(1).max(999),
})

const messages = (input: unknown) =>
  Object.fromEntries(
    (schema.safeParse(input, { error: issueKey }).error?.issues ?? []).map((issue) => [
      issue.path.join('.'),
      issue.message,
    ]),
  )

describe('issueKey', () => {
  it('reads an empty value as required, whatever the rule', () => {
    expect(
      messages({
        accountId: '',
        email: ' ',
        name: '',
        count: null,
      }),
    ).toEqual({
      accountId: 'required',
      email: 'required',
      name: 'required',
      count: 'required',
    })
  })

  it('names the broken rule of a filled value, with its limit', () => {
    expect(
      messages({
        accountId: 'x',
        email: 'name@',
        name: 'abcdef',
        count: 1000,
      }),
    ).toEqual({
      accountId: 'formatInvalid',
      email: 'emailInvalid',
      name: 'tooLong:5',
      count: 'outOfRange',
    })
    expect(
      messages({
        accountId: crypto.randomUUID(),
        email: 'a@b.ua',
        name: 'a',
        count: 1,
      }),
    ).toEqual({
      name: 'tooShort:2',
    })
  })

  it('keeps a message the schema sets itself', () => {
    const result = z.string().min(1, { message: 'nameRequired' }).safeParse('', { error: issueKey })

    expect(result.error?.issues[0]?.message).toBe('nameRequired')
  })
})
