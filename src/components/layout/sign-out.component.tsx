'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button.component'
import { useSignOut } from './sign-out.hook'

// The sign-out button of Settings and of the bottom of the phone Space tab
export function SignOut() {
  const translate = useTranslations('settings.signOut')
  const { start, pending, confirmSheet } = useSignOut()

  return (
    <>
      <Button variant="danger" disabled={pending} onClick={start}>
        {translate('action')}
      </Button>
      {confirmSheet}
    </>
  )
}
