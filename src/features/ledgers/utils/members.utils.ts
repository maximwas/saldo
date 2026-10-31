type MemberLike = {
  name: string | null
  email: string | null
}

/** a member without a name in this space is shown by the start of their email (members cannot all set names yet) */
export const memberName = (member: MemberLike) => member.name ?? member.email?.split('@')[0] ?? '—'
