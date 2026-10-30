import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form'

/** schemas report message keys («amountInvalid»); the form shows the text of the active locale */
export function withTranslatedErrors<Input extends FieldValues, Output>(
  resolver: Resolver<Input, unknown, Output>,
  translate: (key: string) => string,
): Resolver<Input, unknown, Output> {
  return async (values, context, options) => {
    const result = await resolver(values, context, options)
    const errors = Object.fromEntries(
      Object.entries(result.errors).map(([name, error]) => [
        name,
        error && typeof error.message === 'string'
          ? {
              ...error,
              message: translate(error.message),
            }
          : error,
      ]),
    ) as FieldErrors<Input>

    return {
      ...result,
      errors,
    } as ReturnType<Resolver<Input, unknown, Output>> extends Promise<infer Result> ? Result : never
  }
}
