/** service name (lower case) → file in public/logos, exported from Figma «Saldo» → Service logos 1:167 */
const SERVICE_LOGOS: Record<string, string> = {
  netflix: 'netflix',
  spotify: 'spotify',
  'google one': 'google-one',
  kyivstar: 'kyivstar',
  rozetka: 'rozetka-prom-smart',
}

/** the logo of a service, matched by its whole name or its first words (e.g. a credit named after its shop); null when there is none */
export function serviceLogoOf(name: string): string | null {
  const key = name.trim().toLowerCase()
  const service = Object.keys(SERVICE_LOGOS).find((candidate) => key === candidate || key.startsWith(`${candidate} `))

  return service ? `/logos/${SERVICE_LOGOS[service]}.svg` : null
}
