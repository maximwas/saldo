import { SettingsTabs } from '@/features/settings/components/settings-tabs.component'

export default function SettingsLayout({ children }: LayoutProps<'/settings'>) {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <SettingsTabs />
      {children}
    </div>
  )
}
