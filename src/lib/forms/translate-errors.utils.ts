import type { FieldErrors, FieldValues } from 'react-hook-form'

type ErrorNode = {
  message?: unknown
  [key: string]: unknown
}

const isNode = (value: unknown): value is ErrorNode => typeof value === 'object' && value !== null

/** Zod messages in our schemas are keys of the errors namespace; this swaps every message for its text */
export function translateErrors<Values extends FieldValues>(
  errors: FieldErrors<Values>,
  translate: (key: string) => string,
): FieldErrors<Values> {
  const walk = (node: ErrorNode): ErrorNode =>
    Object.fromEntries(
      Object.entries(node).map(([key, value]) => {
        if (key === 'message' && typeof value === 'string') {
          return [key, translate(value)]
        }

        // `ref` points at a DOM element: leave it alone
        if (key !== 'ref' && isNode(value)) {
          return [key, walk(value)]
        }

        return [key, value]
      }),
    )

  return walk(errors as ErrorNode) as FieldErrors<Values>
}
