import type { SaldoClient } from '@/types/supabase.types'
import type { CreditInstallment } from './credit-installments.utils'

type InstallmentRow = {
  id: string
  source_id: string | null
  sequence_no: number | null
}

const toInstallments = ({ id, source_id: creditId, sequence_no: sequenceNo }: InstallmentRow): CreditInstallment[] =>
  creditId && sequenceNo !== null
    ? [
        {
          obligationId: id,
          creditId,
          sequenceNo,
        },
      ]
    : []

/** the numbered installments of the space's active credit schedules, of the given credits or of all of them */
export async function listCreditInstallments(
  supabase: SaldoClient,
  ledgerId: string,
  creditIds?: string[],
): Promise<CreditInstallment[]> {
  let query = supabase
    .from('obligations')
    .select('id, source_id, sequence_no')
    .eq('ledger_id', ledgerId)
    .eq('source_type', 'credit')
    .eq('lifecycle', 'active')

  if (creditIds) {
    query = query.in('source_id', creditIds)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data.flatMap(toInstallments)
}
