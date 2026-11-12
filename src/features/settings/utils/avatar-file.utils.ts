const MEGABYTE = 1024 * 1024
const MAX_MEGABYTES = 10

/** what the file picker offers and the editor can read; the saved photo is always a 512×512 image */
export const AVATAR_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type AvatarFileProblem =
  | {
      kind: 'tooBig'
      /** rounded up to a tenth, for «The photo is too big (24 MB)» */
      sizeMb: number
    }
  | {
      kind: 'notImage'
    }

/** checked before the editor opens (Figma 59:153687 / 59:154092): the type first, a 30 MB PDF is «not a photo» */
export function avatarFileProblem(file: Pick<File, 'size' | 'type'>): AvatarFileProblem | null {
  if (!(AVATAR_FILE_TYPES as readonly string[]).includes(file.type)) {
    return {
      kind: 'notImage',
    }
  }

  if (file.size > MAX_MEGABYTES * MEGABYTE) {
    return {
      kind: 'tooBig',
      sizeMb: Math.ceil((file.size / MEGABYTE) * 10) / 10,
    }
  }

  return null
}
