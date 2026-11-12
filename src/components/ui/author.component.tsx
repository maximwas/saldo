import { useTranslations } from 'next-intl'
import { useAuthor } from '@/lib/members/members.hook'
import { Avatar } from './avatar.component'

type AuthorProps = {
  /** created_by of the record */
  userId: string | null
}

// Figma «Saldo» → ListItem 2:8012 «Show author» (the date line: avatar, then the date) and TableRow 2:9770 (before
// the amount): the 20 px author of a record, only in a space of two or more people; never before the title
export function AuthorAvatar({ userId }: AuthorProps) {
  const translate = useTranslations('common')
  const author = useAuthor(userId)

  if (!author) {
    return null
  }

  return (
    <Avatar
      name={author.name}
      src={author.avatarUrl}
      size={20}
      label={translate('addedBy', {
        name: author.name,
      })}
    />
  )
}

// Figma 33:101623 / 33:101738: «Added by <name>» with the 20 px avatar at the top of an item's details
export function AddedBy({ userId }: AuthorProps) {
  const translate = useTranslations('common')
  const author = useAuthor(userId)

  if (!author) {
    return null
  }

  return (
    <p className="flex items-center gap-2 text-label text-text-secondary">
      <Avatar name={author.name} src={author.avatarUrl} size={20} />
      {translate('addedBy', {
        name: author.name,
      })}
    </p>
  )
}
