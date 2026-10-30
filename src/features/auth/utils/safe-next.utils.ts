// `?next=` after login: only a same-origin path, never `//host` or `https://…` (open redirect)
export function safeNextPath(next: string | null | undefined): string {
  if (!next?.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return '/'
  }

  return next
}
