import 'server-only'
import pRetry from 'p-retry'
import type { Logger } from 'pino'
import { logPgError } from '@/lib/supabase/pg-error.server'
import { localDate } from '@/lib/utils/clock.utils'
import type { SaldoClient } from '@/types/supabase.types'
import { parseNbuRates, toReferenceRows } from '../utils/nbu-rates.utils'

const NBU_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json'

/** NBU answer for today in Kyiv: three tries of 10 s each, 1 s and 2 s apart. The date is explicit because without it
 * NBU answers with tomorrow's rate once it is set in the afternoon */
function fetchNbuAnswer(): Promise<unknown> {
  const date = localDate(new Date(), 'Europe/Kyiv').replaceAll('-', '')

  return pRetry(
    async () => {
      const response = await fetch(`${NBU_URL}&date=${date}`, { signal: AbortSignal.timeout(10_000) })

      if (!response.ok) {
        throw new Error(`NBU answered ${response.status}`)
      }

      return response.json()
    },
    {
      retries: 2,
      minTimeout: 1000,
    },
  )
}

/**
 * Today's NBU rates into every space as reference rates (architecture §7, Maxim 2026-11-03). Null on any failure, and
 * then nothing is written: the rates already stored keep applying by rule A. A second run the same day changes nothing.
 */
export async function refreshReferenceRates(admin: SaldoClient, jobLog: Logger): Promise<number | null> {
  let nbuRates: ReturnType<typeof parseNbuRates>

  try {
    nbuRates = parseNbuRates(await fetchNbuAnswer())
  } catch (error) {
    jobLog.error({ err: error }, 'cron/daily failed: NBU rates')

    return null
  }

  if (nbuRates.length === 0) {
    jobLog.error('cron/daily failed: NBU answered without rates')

    return null
  }

  // shortcut: one page of PostgREST rows (1000 spaces); page by id once there are more
  const { data: ledgers, error } = await admin.from('ledgers').select('id, base_currency')

  if (error) {
    logPgError(jobLog, error, 'cron/daily failed: spaces for NBU rates')

    return null
  }

  const rows = toReferenceRows(nbuRates, ledgers)

  if (rows.length === 0) {
    return 0
  }

  const upsert = await admin.from('fx_rates').upsert(rows, {
    onConflict: 'ledger_id,base_currency,quote_currency,rate_on,source',
    ignoreDuplicates: true,
  })

  if (upsert.error) {
    logPgError(jobLog, upsert.error, 'cron/daily failed: NBU rates upsert')

    return null
  }

  return rows.length
}
