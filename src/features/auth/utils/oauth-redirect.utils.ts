// Supabase DCR lets anyone register a client with any redirect URI: consent is offered only to the MCP clients Saldo
// supports (docs/mcp-connectors.md), so a phishing client sending the code to its own host cannot be allowed by a click
const KNOWN_REDIRECTS = [
  // Claude (claude.ai, Desktop, mobile)
  /^https:\/\/claude\.(ai|com)\/api\/mcp\/auth_callback$/,
  // ChatGPT apps and connectors
  /^https:\/\/chatgpt\.com\/(connector_platform_oauth_redirect|connector\/oauth\/[\w-]+)$/,
  // Perplexity, web and Enterprise
  /^https:\/\/(www|enterprise)\.perplexity\.ai\/rest\/connections\/oauth_callback$/,
  // Mistral Le Chat
  /^https:\/\/callback\.mistral\.ai\/v1\/integrations_auth\/oauth2_callback$/,
  // the person's own machine: Claude Code, Gemini CLI, MCP Inspector (the code never leaves it)
  /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?\/[^?#]*$/,
]

/** the redirect belongs to a supported MCP client or to a loopback address */
export const isKnownRedirect = (uri: string) => KNOWN_REDIRECTS.some((pattern) => pattern.test(uri))

/** the host the authorization code goes to, shown on the consent card; the raw text when it is not a URL */
export function redirectHost(uri: string): string {
  try {
    return new URL(uri).host
  } catch {
    return uri
  }
}
