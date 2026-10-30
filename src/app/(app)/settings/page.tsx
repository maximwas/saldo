import { useTranslations } from 'next-intl'
import { LocaleSwitcher } from '@/features/settings/components/locale-switcher.component'
import { ThemeSwitcher } from '@/features/settings/components/theme-switcher.component'

// Figma «Saldo» → Settings, General tab, frame 11:72807: cards 11:73032 (theme) and 11:73055 (language), gap 24;
// a Card has padding 24, gap 20, radius card, shadow-card, title text/card-title; its body is the hint (text/label,
// text-secondary) and the SegmentedControl, gap 16. The settings tabs land with the settings feature.
export default function SettingsPage() {
  const translate = useTranslations('settings')

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-5 rounded-card bg-card p-6 shadow-card">
        <h2 className="text-card-title text-text-primary">{translate('themeTitle')}</h2>
        <div className="flex flex-col gap-4">
          <p className="text-label text-text-secondary">{translate('themeHint')}</p>
          <ThemeSwitcher />
        </div>
      </section>
      <section className="flex flex-col gap-5 rounded-card bg-card p-6 shadow-card">
        <h2 className="text-card-title text-text-primary">{translate('languageTitle')}</h2>
        <div className="flex flex-col gap-4">
          <p className="text-label text-text-secondary">{translate('languageHint')}</p>
          <LocaleSwitcher />
        </div>
      </section>
    </div>
  )
}
