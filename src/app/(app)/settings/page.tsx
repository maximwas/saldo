import { useTranslations } from 'next-intl'
import { LocaleSwitcher } from '@/features/settings/components/locale-switcher.component'

// Figma «Saldo» → Settings screen 2:30818: the settings tabs land with the settings feature; for now one Card (padding
// 24, gap 20, radius card, shadow-card, title text/card-title) holds the language
export default function SettingsPage() {
  const translate = useTranslations('settings')

  return (
    <section className="flex flex-col gap-5 rounded-card bg-card p-6 shadow-card">
      <div className="flex flex-col gap-1">
        <h2 className="text-card-title text-text-primary">{translate('languageTitle')}</h2>
        <p className="text-label text-text-secondary">{translate('languageHint')}</p>
      </div>
      <LocaleSwitcher />
    </section>
  )
}
