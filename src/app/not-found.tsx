import { SearchX } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button.component'
import { EmptyState } from '@/components/ui/empty-state.component'

// the app's own 404 in the person's language (QA2 #17: Next's default page was in English)
export default async function NotFound() {
  const translate = await getTranslations('common.notFound')

  return (
    <div className="flex justify-center px-5 py-16">
      <EmptyState
        icon={SearchX}
        tone="neutral"
        title={translate('title')}
        hint={translate('hint')}
        action={
          <Button variant="secondary" render={<Link href="/" />} nativeButton={false}>
            {translate('home')}
          </Button>
        }
      />
    </div>
  )
}
