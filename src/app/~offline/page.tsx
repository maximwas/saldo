import { CloudOff } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

// The service worker's fallback for a page this device has never opened (plan 8.3); pages opened before come from its
// cache with the data kept in IndexedDB. A plain link, not next/link: offline only a full load reaches the worker.
export default async function OfflinePage() {
  const translate = await getTranslations('sync.offlinePage')

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-app px-5 text-center">
      <CloudOff aria-hidden size={32} className="text-text-secondary" />
      <h1 className="font-display text-page-title text-text-primary">{translate('title')}</h1>
      <p className="max-w-100 text-body text-text-secondary">{translate('hint')}</p>
      <a href="/" className="text-body font-medium text-primary-text">
        {translate('home')}
      </a>
    </main>
  )
}
