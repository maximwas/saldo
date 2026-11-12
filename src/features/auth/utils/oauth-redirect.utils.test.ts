import { describe, expect, it } from 'vitest'
import { isKnownRedirect, redirectHost } from './oauth-redirect.utils'

describe('isKnownRedirect', () => {
  it('allows the callbacks of the supported clients', () => {
    expect(isKnownRedirect('https://claude.ai/api/mcp/auth_callback')).toBe(true)
    expect(isKnownRedirect('https://claude.com/api/mcp/auth_callback')).toBe(true)
    expect(isKnownRedirect('https://chatgpt.com/connector_platform_oauth_redirect')).toBe(true)
    expect(isKnownRedirect('https://chatgpt.com/connector/oauth/abc_123-XYZ')).toBe(true)
    expect(isKnownRedirect('https://www.perplexity.ai/rest/connections/oauth_callback')).toBe(true)
    expect(isKnownRedirect('http://localhost:6274/oauth/callback')).toBe(true)
    expect(isKnownRedirect('http://127.0.0.1:53682/callback')).toBe(true)
  })

  it('refuses any other host, scheme or a lookalike', () => {
    expect(isKnownRedirect('https://evil.example.com/callback')).toBe(false)
    expect(isKnownRedirect('https://claude.ai.evil.example.com/api/mcp/auth_callback')).toBe(false)
    expect(isKnownRedirect('https://claude.ai/api/mcp/auth_callback?next=https://evil.example.com')).toBe(false)
    expect(isKnownRedirect('http://localhost.evil.example.com/callback')).toBe(false)
    expect(isKnownRedirect('http://claude.ai/api/mcp/auth_callback')).toBe(false)
    expect(isKnownRedirect('myapp://callback')).toBe(false)
  })
})

describe('redirectHost', () => {
  it('shows the host, or the text when it is not a URL', () => {
    expect(redirectHost('http://localhost:6274/oauth/callback')).toBe('localhost:6274')
    expect(redirectHost('not a url')).toBe('not a url')
  })
})
