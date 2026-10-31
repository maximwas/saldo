import { describe, expect, it } from 'vitest'
import { serviceLogoOf } from './service-logo.utils'

describe('serviceLogoOf', () => {
  it('finds a logo by the whole name or its first words, in any case', () => {
    expect(serviceLogoOf('Netflix')).toBe('/logos/netflix.svg')
    expect(serviceLogoOf(' google one ')).toBe('/logos/google-one.svg')
    expect(serviceLogoOf('Rozetka — пилосос')).toBe('/logos/rozetka-prom-smart.svg')
  })

  it('gives null for a name without a logo or one that only starts with the same letters', () => {
    expect(serviceLogoOf('Цитрус — смартфон')).toBeNull()
    expect(serviceLogoOf('Netflixer')).toBeNull()
  })
})
