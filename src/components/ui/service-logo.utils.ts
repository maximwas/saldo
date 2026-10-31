type LogoEntry = {
  /** file in public/logos, exported from Figma «Saldo» → Service logos 1:167 */
  file: string
  /** the Figma Logo component draws this image inset by 18.75% (spacing-1_5 on a 32 tile) instead of full-bleed */
  inset?: boolean
  /** shown in the service picker as typed; the picker lists only `popular` ones until the user searches */
  label?: string
  popular?: boolean
}

/** service name (lower case) → its logo. Order = the order of the picker in Figma «Saldo» (29:93202) */
const SERVICE_LOGOS: Record<string, LogoEntry> = {
  netflix: {
    file: 'netflix.svg',
    label: 'Netflix',
    popular: true,
  },
  'youtube premium': {
    file: 'youtube-premium.png',
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
    file: 'megogo.png',
    label: 'Megogo',
    popular: true,
  },
  'icloud+': {
    file: 'icloud-plus.png',
    label: 'iCloud+',
    popular: true,
  },
  'google ai pro': {
    file: 'google-ai-pro.png',
    inset: true,
    label: 'Google AI Pro',
  },
  'google workspace': {
    file: 'google-workspace.png',
    inset: true,
    label: 'Google Workspace',
  },
  'google play pass': {
    file: 'google-play-pass.png',
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
