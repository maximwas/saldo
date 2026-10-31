import type { z } from 'zod'

const isEmpty = (input: unknown) =>
  input === undefined || input === null || (typeof input === 'string' && input.trim() === '')

/**
 * Zod error map of the forms: an issue the schema gives no message of its own becomes a key of the errors namespace,
 * with the limit after «:» where the text needs it («tooLong:200»); useZodResolver translates it
 */
export function issueKey(issue: z.core.$ZodRawIssue): string {
  if (isEmpty(issue.input)) {
    return 'required'
  }

  switch (issue.code) {
    case 'too_small':
      return issue.origin === 'string' ? `tooShort:${issue.minimum}` : 'outOfRange'
    case 'too_big':
      return issue.origin === 'string' ? `tooLong:${issue.maximum}` : 'outOfRange'
    case 'invalid_format':
      return issue.format === 'email' ? 'emailInvalid' : 'formatInvalid'
    default:
      return 'invalid'
  }
}
