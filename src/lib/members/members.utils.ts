export type MemberProfile = {
  name: string
  /** /api/avatars/<id>?v=<version>; null = no photo, the first letter is shown */
  avatarUrl: string | null
}

type MemberLike = {
  name: string | null
  email: string | null
}

/** a member without a name in this space is shown by the start of their email */
export function memberName(member: MemberLike) {
  return member.name?.trim() || member.email?.split('@')[0] || '—'
}

/** the version in the URL is the time of the upload: a new photo is a new URL, so a cached old one is never shown */
export function avatarUrl(userId: string, updatedAt: string | null) {
  return `/api/avatars/${userId}?v=${Date.parse(updatedAt ?? '') || 0}`
}

/** who added a record, shown only where two or more people share the space (Maxim, 3.11): alone, it is always you.
 * An author who left the space or a record without one (written by the server) shows nothing. */
export function authorOf(members: Readonly<Record<string, MemberProfile>>, userId: string | null) {
  if (!userId || Object.keys(members).length < 2) {
    return null
  }

  return members[userId] ?? null
}
