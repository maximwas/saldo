import { describe, expect, it } from 'vitest'
import { SERVICE_CHOICES, serviceLogoIsInset, serviceLogoOf } from './service-logo.utils'

describe('serviceLogoOf', () => {
  it('finds a logo by the whole name or its first words, in any case', () => {
    expect(serviceLogoOf('Netflix')).toBe('/logos/netflix.svg')
    expect(serviceLogoOf(' google one ')).toBe('/logos/google-one.svg')
    expect(serviceLogoOf('Rozetka — пилосос')).toBe('/logos/rozetka-prom-smart.svg')
    expect(serviceLogoOf('iCloud+')).toBe('/logos/icloud-plus.png')
  })

  it('gives null for a name without a logo or one that only starts with the same letters', () => {
    expect(serviceLogoOf('Цитрус — смартфон')).toBeNull()
    expect(serviceLogoOf('Netflixer')).toBeNull()
  })
})

describe('service picker catalog', () => {
  it('keeps the six Figma services short-listed and the Google extras for search', () => {
    expect(SERVICE_CHOICES.filter((service) => service.popular).map((service) => service.name)).toEqual([
      'Netflix',
      'YouTube Premium',
      'Google One',
      'Spotify',
      'Megogo',
      'iCloud+',
    ])
    expect(SERVICE_CHOICES.map((service) => service.name)).toContain('Google Play Pass')
    expect(serviceLogoIsInset('Google Play Pass')).toBe(true)
    expect(serviceLogoIsInset('Netflix')).toBe(false)
  })
})
