import { Suspense } from 'react'
import { CreditCard } from '@/features/credits/components/credit-card.component'

// params are URL data: read inside <Suspense> so the shell stays instant (cacheComponents)
export default function CreditPage({ params }: PageProps<'/payments/credits/[id]'>) {
  return (
    <Suspense>
      <Card params={params} />
    </Suspense>
  )
}

async function Card({ params }: Pick<PageProps<'/payments/credits/[id]'>, 'params'>) {
  const { id } = await params

  return <CreditCard creditId={id} />
}
