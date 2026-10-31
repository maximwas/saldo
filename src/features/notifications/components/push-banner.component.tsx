'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { Sheet } from '@/components/ui/sheet.component'
import type { PushState } from '../hooks/push.hook'

type PushBannerProps = {
  state: PushState
  onEnableAction: () => void
}

const ACTION_CLASS = 'cursor-pointer rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-primary'

// Figma «Saldo» → Notifications · enable push 36:111176 (Info «Turn on push…» + «Turn on») and · push blocked 36:111379
// (Warning «Notifications are blocked in the browser» + «How to allow»). The permission prompt comes only from the
// click on «Turn on» (plan 3.6). iOS outside the Home Screen gets the explanation of plan 3.7 as an Info banner;
// «on» and «unavailable» show nothing.
export function PushBanner({ state, onEnableAction }: PushBannerProps) {
  const translate = useTranslations('notifications')
  const translateCommon = useTranslations('common')
  const [explaining, setExplaining] = useState(false)

  if (state === 'off') {
    return (
      <Banner
        action={
          <button type="button" onClick={onEnableAction} className={ACTION_CLASS}>
            {translate('pushBanner.action')}
          </button>
        }
      >
        {translate('pushBanner.enable')}
      </Banner>
    )
  }

  if (state === 'denied') {
    return (
      <>
        <Banner
          kind="warning"
          action={
            <button type="button" onClick={() => setExplaining(true)} className={ACTION_CLASS}>
              {translate('pushBanner.how')}
            </button>
          }
        >
          {translate('pushBanner.denied')}
        </Banner>
        {explaining ? (
          <Sheet
            open
            onOpenChange={(open) => !open && setExplaining(false)}
            title={translate('pushBanner.howTitle')}
            footer={
              <Button type="button" variant="secondary" onClick={() => setExplaining(false)}>
                {translateCommon('close')}
              </Button>
            }
          >
            <p className="text-body text-text-secondary">{translate('push.denied.text')}</p>
          </Sheet>
        ) : null}
      </>
    )
  }

  return state === 'homeScreen' ? <Banner>{translate('push.homeScreen.text')}</Banner> : null
}
