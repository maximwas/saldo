'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn.utils'
import { Input } from './input.component'

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'>

/** a password Input with a show / hide toggle at its right edge; Field's id and aria props reach the input itself.
 * The toggle says «characters», not «password»: the field alone keeps the password label */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const translate = useTranslations('common.password')
  const [shown, setShown] = useState(false)

  return (
    <div className="relative">
      <Input {...props} type={shown ? 'text' : 'password'} className={cn('pr-12', className)} />
      <button
        type="button"
        aria-pressed={shown}
        aria-label={translate(shown ? 'hide' : 'show')}
        onClick={() => setShown(!shown)}
        className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center rounded-md text-text-tertiary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary"
      >
        {shown ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
      </button>
    </div>
  )
}
