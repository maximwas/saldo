import { Suspense } from 'react'
import { DataExportCard } from '@/features/data-export/components/data-export-card.component'
import { DeleteDataCard } from '@/features/data-export/components/delete-data-card.component'
import { getActiveLedger } from '@/lib/auth/dal.server'

// Settings → Data (plan 7.4, 7.7): any member exports; only the owner sees "Delete all data"
export default function DataSettingsPage() {
  return (
    <div className="flex max-w-180 flex-col gap-4 lg:gap-6">
      <DataExportCard />
      <Suspense>
        <OwnerDelete />
      </Suspense>
    </div>
  )
}

// the role is request data: read inside <Suspense> so the export card stays instant
async function OwnerDelete() {
  const ledger = await getActiveLedger()

  return ledger?.role === 'owner' ? <DeleteDataCard /> : null
}
