import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import type { FieldValues, Resolver } from 'react-hook-form'
import type { z } from 'zod'
import { issueKey } from './issue-key.utils'
import { translateErrors } from './translate-errors.utils'

/**
 * zodResolver whose messages come out translated: schema messages are keys of the `errors` namespace, and an issue
 * without one gets a key from issueKey (empty → «required», too long → «tooLong:N», bad email → «emailInvalid» …)
 */
export function useZodResolver<Schema extends z.ZodType<FieldValues, FieldValues>>(schema: Schema) {
  const translate = useTranslations('errors')

  return useMemo<Resolver<z.input<Schema>, unknown, z.output<Schema>>>(() => {
    // zodResolver is typed for the schema's own generics; here they are the schema's, so the cast only restates them
    const base = zodResolver(schema, { error: issueKey }) as unknown as Resolver<
      z.input<Schema>,
      unknown,
      z.output<Schema>
    >
    // a key may carry a count («tooLong:200»); next-intl types each key's own values, the keys here are dynamic
    const text = translate as unknown as { has: (key: string) => boolean } & ((
      key: string,
      values?: { count: number },
    ) => string)
    const translateKey = (message: string) => {
      const [key = '', count] = message.split(':')

      return text.has(key) ? text(key, count === undefined ? undefined : { count: Number(count) }) : text('required')
    }

    return async (values, context, options) => {
      const result = await base(values, context, options)

      return {
        ...result,
        errors: translateErrors(result.errors, translateKey),
      } as Awaited<ReturnType<Resolver<z.input<Schema>, unknown, z.output<Schema>>>>
    }
  }, [schema, translate])
}
