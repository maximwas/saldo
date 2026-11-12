import { CATEGORY_COLORS } from '@/constants/category-colors.constants'

type LogoEntry = {
  /** file in public/logos: the brand's own vector mark, placed on the tile as in Figma «Saldo» → Service logos 1:167 */
  file: string
  /** the Figma Logo component draws this image inset by 18.75% (spacing-1_5 on a 32 tile) instead of full-bleed */
  inset?: boolean
  /** shown in the service picker as typed; the picker lists only `popular` ones until the user searches */
  label?: string
  popular?: boolean
}

// Marks (trademarks of their owners, shown only to name the service): svgl.app (Netflix, Spotify, YouTube, Google G,
// Google Play, Gemini), Wikimedia Commons (Google One, iCloud, Kyivstar star, Megogo icon), rozetka.com.ua's own logo
// (the mascot). Vectors only: the 1:167 export wrapped 256 px bitmaps in SVG and blurred at 40 px (Maxim, 3.11)
/** service name (lower case) → its logo. Order = the order of the picker in Figma «Saldo» (29:93202) */
const SERVICE_LOGOS: Record<string, LogoEntry> = {
  netflix: {
    file: 'netflix.svg',
    label: 'Netflix',
    popular: true,
  },
  'youtube premium': {
    file: 'youtube-premium.svg',
    label: 'YouTube Premium',
    popular: true,
  },
  'google one': {
    file: 'google-one.svg',
    label: 'Google One',
    popular: true,
  },
  spotify: {
    file: 'spotify.svg',
    label: 'Spotify',
    popular: true,
  },
  megogo: {
    file: 'megogo.svg',
    label: 'Megogo',
    popular: true,
  },
  'icloud+': {
    file: 'icloud-plus.svg',
    label: 'iCloud+',
    popular: true,
  },
  'google ai pro': {
    file: 'google-ai-pro.svg',
    inset: true,
    label: 'Google AI Pro',
  },
  'google workspace': {
    file: 'google-workspace.svg',
    inset: true,
    label: 'Google Workspace',
  },
  'google play pass': {
    file: 'google-play-pass.svg',
    inset: true,
    label: 'Google Play Pass',
  },
  kyivstar: { file: 'kyivstar.svg' },
  rozetka: { file: 'rozetka-prom-smart.svg' },
}

/** services the subscription picker offers: name, logo, whether it is in the short list */
export const SERVICE_CHOICES = Object.values(SERVICE_LOGOS).flatMap((entry) =>
  entry.label
    ? [
        {
          name: entry.label,
          popular: Boolean(entry.popular),
        },
      ]
    : [],
)

const entryOf = (name: string): LogoEntry | null => {
  const key = name.trim().toLowerCase()
  const service = Object.keys(SERVICE_LOGOS).find((candidate) => key === candidate || key.startsWith(`${candidate} `))

  return service ? SERVICE_LOGOS[service] : null
}

/** the logo of a service, matched by its whole name or its first words (e.g. a credit named after its shop); null when there is none */
export const serviceLogoOf = (name: string): string | null => {
  const entry = entryOf(name)

  return entry ? `/logos/${entry.file}` : null
}

export const serviceLogoIsInset = (name: string): boolean => entryOf(name)?.inset ?? false

// the first eight presets, the LetterAvatar colours of the Figma frames (the two credits are yellow and blue on Overview 2:8326)
const LETTER_COLORS = CATEGORY_COLORS.slice(0, 8)

/** the same name always gets the same colour, so a service or a person is recognisable across lists */
export function letterColorOf(name: string) {
  return LETTER_COLORS[[...name].reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0) % LETTER_COLORS.length]
}
