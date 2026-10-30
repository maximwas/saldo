import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCALES, MESSAGE_NAMESPACES } from './locale.utils'

const MESSAGES_DIR = join(process.cwd(), 'messages')

const readNamespace = (locale: string, namespace: string): unknown =>
  JSON.parse(readFileSync(join(MESSAGES_DIR, locale, `${namespace}.json`), 'utf8'))

// leaf paths with their values: «roles.owner» → «Owner»
function leaves(node: unknown, prefix = ''): [string, unknown][] {
  if (typeof node !== 'object' || node === null) {
    return [[prefix, node]]
  }

  return Object.entries(node).flatMap(([key, value]) => leaves(value, prefix ? `${prefix}.${key}` : key))
}

describe('messages', () => {
  it.each(LOCALES)('%s has exactly the namespaces request.ts loads', (locale) => {
    const files = readdirSync(join(MESSAGES_DIR, locale)).sort()

    expect(files).toEqual(MESSAGE_NAMESPACES.map((namespace) => `${namespace}.json`).sort())
  })

  it.each(MESSAGE_NAMESPACES)('%s has the same keys in every locale, none empty', (namespace) => {
    const [source, ...others] = LOCALES.map((locale) => leaves(readNamespace(locale, namespace)))
    const sourceKeys = source.map(([key]) => key).sort()

    for (const other of others) {
      expect(other.map(([key]) => key).sort()).toEqual(sourceKeys)
    }

    for (const [key, value] of [source, ...others].flat()) {
      expect(typeof value === 'string' && value.trim() !== '', key).toBe(true)
    }
  })
})
