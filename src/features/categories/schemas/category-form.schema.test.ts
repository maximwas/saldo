import { describe, expect, it } from 'vitest'
import {
  type CategoryFormValues,
  categoryFormSchema,
  toCreateCategoryInput,
  toUpdateCategoryInput,
} from './category-form.schema'
import { createCategoryInputSchema } from './category-input.schema'

const values: CategoryFormValues = {
  name: ' Кафе ',
  kind: 'expense',
  parentId: null,
  color: 'yellow',
  icon: 'coffee',
}

describe('categoryFormSchema', () => {
  it('refuses an empty name with an error key', () => {
    const result = categoryFormSchema.safeParse({
      ...values,
      name: '  ',
    })

    expect(result.error?.issues[0].message).toBe('nameRequired')
  })

  it('accepts no colour: a neutral category', () => {
    expect(
      categoryFormSchema.safeParse({
        ...values,
        color: null,
      }).success,
    ).toBe(true)
  })

  it('refuses a colour that is not a token', () => {
    expect(
      categoryFormSchema.safeParse({
        ...values,
        color: '#ff0000',
      }).success,
    ).toBe(false)
  })
})

describe('category mappers', () => {
  it('builds a row the input schema accepts, with the parent of a subcategory', () => {
    const parentId = crypto.randomUUID()
    const input = toCreateCategoryInput(
      {
        ...values,
        parentId,
      },
      {
        id: crypto.randomUUID(),
        ledgerId: crypto.randomUUID(),
        sortOrder: 3,
      },
    )

    expect(createCategoryInputSchema.parse(input)).toMatchObject({
      name: 'Кафе',
      parent_id: parentId,
      sort_order: 3,
    })
  })

  it('an update changes name, colour and icon only', () => {
    expect(
      toUpdateCategoryInput(values, {
        id: 'x',
        expectedVersion: 2,
      }),
    ).toEqual({
      id: 'x',
      expectedVersion: 2,
      patch: {
        name: 'Кафе',
        color: 'yellow',
        icon: 'coffee',
      },
    })
  })
})
