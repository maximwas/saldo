import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import type { FieldValues, Resolver } from 'react-hook-form'
import type { z } from 'zod'
import { translateErrors } from './translate-errors.utils'

/**
 * zodResolver whose messages come out translated: schema messages are keys of the `errors` namespace, and a
 * Zod default («Invalid UUID») for an empty select becomes the generic «fill in this field»
 */
export function useZodResolver<Schema extends z.ZodType<FieldValues, FieldValues>>(schema: Schema) {
  const translate = useTranslations('errors')

  return useMemo<Resolver<z.input<Schema>, unknown, z.output<Schema>>>(() => {
    // zodResolver is typed for the schema's own generics; here they are the schema's, so the cast only restates them
    const base = zodResolver(schema) as unknown as Resolver<z.input<Schema>, unknown, z.output<Schema>>
    const translateKey = (key: string) =>
      translate.has(key as 'required') ? translate(key as 'required') : translate('required')

    return async (values, context, options) => {
      const result = await base(values, context, options)

      return {
        ...result,
        errors: translateErrors(result.errors, translateKey),
      } as Awaited<ReturnType<Resolver<z.input<Schema>, unknown, z.output<Schema>>>>
    }
  }, [schema, translate])
}
