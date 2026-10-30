'use client'

import { strToU8, type Zippable, zipSync } from 'fflate'
import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button.component'
import { Card } from '@/components/ui/card.component'
import { notify } from '@/components/ui/toaster.component'
import { useToday } from '@/contexts/clock.context'
import { useLedgerStore } from '@/contexts/ledger.context'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { downloadAttachment, listOperationsForCsv, readSpaceData } from '../api/data-export.api'
import { toOperationsCsv } from '../utils/operations-csv.utils'

type ExportKind = 'csv' | 'archive'

// Safari reads the object URL after click() returns, so it is revoked a little later
const REVOKE_AFTER_MS = 60_000

function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS)
}

async function exportCsv(ledgerId: string, day: string) {
  const rows = await listOperationsForCsv(getBrowserSupabase(), ledgerId)

  saveFile(new Blob([toOperationsCsv(rows)], { type: 'text/csv;charset=utf-8' }), `saldo-operations-${day}.csv`)
}

// saldo.json holds the space and every table of it; attachments/<storage path> the receipt files, stored (level 0):
// JPEG and PDF are compressed already
async function exportArchive(ledgerId: string, day: string) {
  const supabase = getBrowserSupabase()
  const data = await readSpaceData(supabase, ledgerId)
  const files: Zippable = {
    'saldo.json': strToU8(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          ...data,
        },
        null,
        2,
      ),
    ),
  }

  for (const path of data.attachmentPaths) {
    files[`attachments/${path}`] = [await downloadAttachment(supabase, path), { level: 0 }]
  }

  saveFile(new Blob([zipSync(files)], { type: 'application/zip' }), `saldo-${day}.zip`)
}

// Settings → Data (Figma "Saldo" Settings tabs 2:30898 list a Data tab; no frame of it: the house Card). Any member
// exports the active space: operations as CSV, or everything as JSON with the receipt files in one zip.
export function DataExportCard() {
  const translate = useTranslations('settings.data')
  const ledgerId = useLedgerStore((ledger) => ledger.ledgerId)
  const today = useToday()
  const [pending, setPending] = useState<ExportKind | null>(null)

  async function run(kind: ExportKind) {
    setPending(kind)

    try {
      await (kind === 'csv' ? exportCsv : exportArchive)(ledgerId, today)
    } catch {
      notify.error(translate('exportFailed'), { onRetry: () => void run(kind) })
    } finally {
      setPending(null)
    }
  }

  return (
    <Card title={translate('exportTitle')}>
      <p className="text-label text-text-secondary">{translate('exportHint')}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="secondary"
          disabled={pending !== null}
          aria-busy={pending === 'csv'}
          onClick={() => run('csv')}
        >
          <Download aria-hidden size={20} />
          {translate('csv')}
        </Button>
        <Button
          variant="secondary"
          disabled={pending !== null}
          aria-busy={pending === 'archive'}
          onClick={() => run('archive')}
        >
          <Download aria-hidden size={20} />
          {translate('archive')}
        </Button>
      </div>
    </Card>
  )
}
