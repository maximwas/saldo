import { Avatar } from '@base-ui/react/avatar'
import { useTranslations } from 'next-intl'

type AuthorAvatarProps = {
  /** null = the author is unknown (deleted account, names not loaded): nothing is drawn */
  name: string | null | undefined
}

// The initial of whoever wrote a record; neutral tokens, because the category palette belongs to categories only
export function AuthorAvatar({ name }: AuthorAvatarProps) {
  const translate = useTranslations('common')

  if (!name) {
    return null
  }

  return (
    <Avatar.Root
      role="img"
      aria-label={translate('author', { name })}
      title={name}
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-subtle text-micro font-semibold text-text-secondary"
    >
      <Avatar.Fallback>{name.charAt(0).toLocaleUpperCase()}</Avatar.Fallback>
    </Avatar.Root>
  )
}
