import { Writable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { createLogger } from './logger.utils'

function captureLines() {
  const lines: Record<string, unknown>[] = []
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(JSON.parse(chunk.toString()))
      callback()
    },
  })

  return {
    lines,
    stream,
  }
}

describe('createLogger', () => {
  it('redacts money, contacts and credentials at any of the first three levels', () => {
    const { lines, stream } = captureLines()
    const logger = createLogger('info', stream)

    logger.info(
      {
        amount: 125_000,
        email: 'olena@example.com',
        operation: {
          id: 'op-1',
          note: 'Invented note',
        },
        request: {
          headers: {
            cookie: 'sb-access=abc',
            authorization: 'Bearer abc',
          },
        },
      },
      'operation saved',
    )

    expect(lines[0]).toMatchObject({
      level: 'info',
      msg: 'operation saved',
      amount: '[redacted]',
      email: '[redacted]',
      operation: {
        id: 'op-1',
        note: '[redacted]',
      },
      request: {
        headers: {
          cookie: '[redacted]',
          authorization: '[redacted]',
        },
      },
    })
  })

  it('keeps the module of a child logger and drops levels below the threshold', () => {
    const { lines, stream } = captureLines()
    const logger = createLogger('info', stream).child({
      module: 'ledgers',
    })

    logger.debug('not written')
    logger.warn({ ledgerId: 'ledger-1' }, 'switch refused')

    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({
      level: 'warn',
      module: 'ledgers',
      ledgerId: 'ledger-1',
    })
  })
})
