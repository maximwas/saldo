import { createHash, randomBytes } from 'node:crypto'
import { type APIRequestContext, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { E2E_PASSWORD, emailOf, type Role } from './users.fixture'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''

export const AUTH_ISSUER = `${SUPABASE_URL}/auth/v1`
export const MCP_PATH = '/api/mcp'
// a loopback client (the Gemini CLI kind) that nobody listens on: the test catches the redirect with page.route
const REDIRECT_URI = 'http://localhost:7777/oauth/callback'
const MCP_HEADERS = {
  accept: 'application/json, text/event-stream',
  'content-type': 'application/json',
  'mcp-protocol-version': '2025-06-18',
}

const base64url = (buffer: Buffer) => buffer.toString('base64url')

/** the local OAuth 2.1 server runs only after `supabase stop && supabase start` with supabase/config.toml */
export async function oauthServerOn() {
  // GoTrue's own metadata path: the local stack serves it, the root /.well-known/…/auth/v1 form is hosted-only
  const response = await fetch(`${AUTH_ISSUER}/.well-known/oauth-authorization-server`)

  return response.ok
}

async function registerClient(request: APIRequestContext, name: string) {
  const response = await request.post(`${AUTH_ISSUER}/oauth/clients/register`, {
    headers: { apikey: PUBLISHABLE_KEY },
    data: {
      client_name: name,
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    },
  })

  expect(response.ok(), await response.text()).toBe(true)

  return ((await response.json()) as { client_id: string }).client_id
}

type Authorize = {
  clientId: string
  challenge: string
  resource: string
}

/** Auth answers /oauth/authorize with a redirect to <site_url>/oauth/consent?authorization_id=: its id is enough */
async function startAuthorization(request: APIRequestContext, { clientId, challenge, resource }: Authorize) {
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 'e2e',
    scope: 'email',
    resource,
  })
  const response = await request.get(`${AUTH_ISSUER}/oauth/authorize?${query}`, {
    headers: { apikey: PUBLISHABLE_KEY },
    maxRedirects: 0,
  })
  const location = new URL(response.headers().location ?? '', 'http://localhost')
  const authorizationId = location.searchParams.get('authorization_id')

  expect(authorizationId, `authorize answered ${response.status()} ${location}`).toBeTruthy()

  return authorizationId as string
}

/** «Allow» on the consent page sends the browser to the client's redirect_uri with ?code= */
async function approve(page: Page, authorizationId: string) {
  let code: string | null = null

  await page.route(`${REDIRECT_URI}**`, async (route) => {
    code = new URL(route.request().url()).searchParams.get('code')
    await route.fulfill({
      status: 200,
      body: 'ok',
    })
  })
  await page.goto(`/oauth/consent?authorization_id=${authorizationId}`)
  await page.getByRole('button', { name: 'Дозволити' }).click()
  await expect.poll(() => code).toBeTruthy()

  return code as unknown as string
}

type Connection = {
  clientId: string
  clientName: string
  accessToken: string
}

/** an MCP client the way Claude or Gemini CLI connect: DCR, PKCE, the person's consent, the code for a token */
export async function connectMcpClient(page: Page, request: APIRequestContext, baseURL: string): Promise<Connection> {
  const clientName = `e2e-mcp-${crypto.randomUUID().slice(0, 8)}`
  const clientId = await registerClient(request, clientName)
  const verifier = base64url(randomBytes(32))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  const resource = new URL(MCP_PATH, baseURL).href
  const authorizationId = await startAuthorization(request, {
    clientId,
    challenge,
    resource,
  })
  const code = await approve(page, authorizationId)
  const response = await request.post(`${AUTH_ISSUER}/oauth/token`, {
    headers: { apikey: PUBLISHABLE_KEY },
    form: {
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
      resource,
    },
  })

  expect(response.ok(), await response.text()).toBe(true)

  return {
    clientId,
    clientName,
    accessToken: ((await response.json()) as { access_token: string }).access_token,
  }
}

/** the app's own session: a JWT without client_id */
export async function appSessionToken(role: Role) {
  const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailOf(role),
    password: E2E_PASSWORD,
  })

  if (error) {
    throw error
  }

  return data.session.access_token
}

export const mcpPost = (request: APIRequestContext, token: string | null, method: string, params: object = {}) =>
  request.post(MCP_PATH, {
    headers: token
      ? {
          ...MCP_HEADERS,
          authorization: `Bearer ${token}`,
        }
      : MCP_HEADERS,
    data: {
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    },
  })

type ToolAnswer = {
  isError: boolean
  text: string
  data: Record<string, unknown>
}

/** tools/call; a stateless answer comes as JSON or as one SSE `data:` line */
export async function callTool(request: APIRequestContext, token: string, name: string, args: object = {}) {
  const response = await mcpPost(request, token, 'tools/call', {
    name,
    arguments: args,
  })

  expect(response.status()).toBe(200)

  const body = await response.text()
  const json = body.startsWith('{')
    ? body
    : (body
        .split('\n')
        .find((line) => line.startsWith('data: '))
        ?.slice(6) ?? '')
  const { result } = JSON.parse(json) as {
    result: {
      isError?: boolean
      content: { text: string }[]
      structuredContent?: Record<string, unknown>
    }
  }

  return {
    isError: result.isError === true,
    text: result.content[0]?.text ?? '',
    data: result.structuredContent ?? {},
  } satisfies ToolAnswer
}
