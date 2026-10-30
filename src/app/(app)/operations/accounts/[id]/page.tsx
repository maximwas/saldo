import { Suspense } from 'react'
import { AccountCard } from '@/features/accounts/components/account-card.component'

// params are URL data: read inside <Suspense> so the shell stays instant (cacheComponents)
export default function AccountPage({ params }: PageProps<'/operations/accounts/[id]'>) {
  return (
    <Suspense>
      <Card params={params} />
    </Suspense>
  )
}

async function Card({ params }: Pick<PageProps<'/operations/accounts/[id]'>, 'params'>) {
  const { id } = await params

  return <AccountCard accountId={id} />
}
