import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge.component'

/** «soon» beside a menu item or tab whose section is not built yet (SOON_SECTIONS), so nobody expects it to work */
export function SoonBadge() {
  const translate = useTranslations('shell')

  return <Badge tone="neutral">{translate('soon.badge')}</Badge>
}
