import { expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database.types'
import {
  AUTH_ISSUER,
  appSessionToken,
  callTool,
  connectMcpClient,
  MCP_PATH,
  mcpPost,
  oauthServerOn,
} from '../fixtures/mcp.fixture'
import { availableMinor, ensureIncomeDate } from '../fixtures/overview.fixture'
import { test } from '../fixtures/roles.fixture'

const OAUTH_OFF =
  'the local OAuth 2.1 server is off: restart the stack (supabase stop && supabase start) after config.toml'

// plan 10.12: Playwright request against /api/mcp, a browser only for the consent page and the screens compared
test('без токена /api/mcp дає 401 з resource_metadata, а метадані ведуть на Supabase Auth', async ({
  request,
  baseURL,
}) => {
  const response = await mcpPost(request, null, 'tools/list')
  const challenge = response.headers()['www-authenticate'] ?? ''

  expect(response.status()).toBe(401)

  const metadataUrl = challenge.match(/resource_metadata="([^"]+)"/)?.[1] ?? ''

  expect(metadataUrl).toContain('/.well-known/oauth-protected-resource/api/mcp')

  const metadata = await (await request.get(metadataUrl)).json()

  expect(metadata).toEqual({
    resource: new URL(MCP_PATH, baseURL).href,
    authorization_servers: [AUTH_ISSUER],
  })
})

test('токен сесії застосунку (без client_id) MCP не приймає', async ({ request }) => {
  const response = await mcpPost(request, await appSessionToken('owner'), 'tools/list')

  expect(response.status()).toBe(401)
})

test('згода видає доступ, він є в Налаштування → Безпека, «Відкликати» з підтвердженням прибирає його й зупиняє клієнта', async ({
  pageAs,
  request,
  baseURL,
}) => {
  test.skip(!(await oauthServerOn()), OAUTH_OFF)

  const owner = await pageAs('owner')
  const client = await connectMcpClient(owner, request, baseURL ?? '')
  const spaces = await callTool(request, client.accessToken, 'list_ledgers')

  expect(spaces.isError).toBe(false)

  await owner.goto('/settings/security')

  const row = owner.getByRole('listitem').filter({ hasText: client.clientName })

  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Відкликати' }).click()

  // nothing is revoked before the confirmation (Figma 43:116607)
  const confirm = owner.getByRole('dialog', { name: `Відкликати доступ ${client.clientName}?` })

  await expect(confirm).toContainText('сесії закриються одразу')
  await confirm.getByRole('button', { name: 'Відкликати доступ' }).click()
  await expect(confirm).toBeHidden()
  await expect(row).toBeHidden()
  await expect.poll(async () => (await mcpPost(request, client.accessToken, 'tools/list')).status()).toBe(401)

  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SECRET_KEY ?? '',
  )
  const { count } = await admin
    .from('mcp_audit_log')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('client_id', client.clientId)
    .eq('tool', 'list_ledgers')

  expect(count).toBe(1)
})

test('«Доступно до дати» через MCP дорівнює числу на Огляді', async ({ pageAs, request, baseURL }) => {
  test.skip(!(await oauthServerOn()), OAUTH_OFF)

  const owner = await pageAs('owner')

  await ensureIncomeDate(owner)

  const onScreen = await availableMinor(owner)
  const client = await connectMcpClient(owner, request, baseURL ?? '')
  const answer = await callTool(request, client.accessToken, 'get_available_to_date')
  const available = answer.data.available as { availableMinor: number | null }

  expect(answer.isError).toBe(false)
  expect(available.availableMinor).toBe(onScreen)
})

test('add_operation: без confirm нічого не пише, двічі з тим самим id — один запис, видалити MCP-клієнт не може', async ({
  pageAs,
  request,
  baseURL,
}) => {
  test.skip(!(await oauthServerOn()), OAUTH_OFF)

  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`
  const owner = await pageAs('owner')
  const { accessToken } = await connectMcpClient(owner, request, baseURL ?? '')
  const balances = await callTool(request, accessToken, 'get_balances')
  const account = (
    balances.data.accounts as {
      id: string
      archivedAt: string | null
    }[]
  ).find((item) => item.archivedAt === null)
  const preview = await callTool(request, accessToken, 'add_operation', {
    kind: 'expense',
    account_id: account?.id,
    amount_minor: 4250,
    counterparty: mark,
  })
  const confirmArguments = preview.data.confirmArguments as { id: string }
  const found = async () =>
    (await callTool(request, accessToken, 'search_operations', { text: mark })).data.operations as unknown[]

  expect(preview.data.preview).toBe(true)
  expect(await found()).toHaveLength(0)

  for (const attempt of [1, 2]) {
    expect(
      (await callTool(request, accessToken, 'add_operation', confirmArguments)).isError,
      `attempt ${attempt}`,
    ).toBe(false)
  }

  expect(await found()).toHaveLength(1)

  // the token is a Supabase JWT: called straight at PostgREST, the delete RPC still refuses an OAuth client
  const deleted = await request.post(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/delete_operation`, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
      authorization: `Bearer ${accessToken}`,
    },
    data: {
      p_id: confirmArguments.id,
      p_expected_version: 1,
    },
  })

  expect(((await deleted.json()) as { code: string }).code).toBe('42501')
  expect(await found()).toHaveLength(1)
})

test('mark_paid: прев’ю нічого не платить, confirm закриває план, повтор нічого не додає', async ({
  pageAs,
  request,
  baseURL,
}) => {
  test.skip(!(await oauthServerOn()), OAUTH_OFF)

  const owner = await pageAs('owner')
  const { accessToken } = await connectMcpClient(owner, request, baseURL ?? '')
  const balances = await callTool(request, accessToken, 'get_balances')
  const account = (
    balances.data.accounts as {
      id: string
      currency: string
      archivedAt: string | null
    }[]
  ).find((item) => item.archivedAt === null)
  const planned = await callTool(request, accessToken, 'create_planned_payment', {
    title: `e2e-${crypto.randomUUID().slice(0, 8)}`,
    planned_amount_minor: 1500,
    currency: account?.currency,
    due_on: new Date().toISOString().slice(0, 10),
    account_id: account?.id,
  })
  const plan = planned.data.confirmArguments as { id: string }
  const open = async () =>
    ((await callTool(request, accessToken, 'list_upcoming')).data.upcoming as { id: string }[]).some(
      (item) => item.id === plan.id,
    )

  expect((await callTool(request, accessToken, 'create_planned_payment', plan)).isError).toBe(false)
  expect(await open()).toBe(true)

  const preview = await callTool(request, accessToken, 'mark_paid', { obligation_id: plan.id })
  const confirmArguments = preview.data.confirmArguments as { payment_id: string }

  expect(preview.data.preview).toBe(true)
  expect(await open()).toBe(true)
  expect((await callTool(request, accessToken, 'mark_paid', confirmArguments)).isError).toBe(false)

  const replay = await callTool(request, accessToken, 'mark_paid', confirmArguments)

  expect(replay.isError).toBe(false)
  expect(replay.data.alreadyWritten).toBeTruthy()
  expect(await open()).toBe(false)
})

test('write-tool з токеном viewer відмовляє', async ({ pageAs, request, baseURL }) => {
  test.skip(!(await oauthServerOn()), OAUTH_OFF)

  const viewer = await pageAs('viewer')
  const { accessToken } = await connectMcpClient(viewer, request, baseURL ?? '')
  const spaces = await callTool(request, accessToken, 'list_ledgers')
  const shared = (
    spaces.data.ledgers as {
      id: string
      role: string
    }[]
  ).find((space) => space.role === 'viewer')
  const answer = await callTool(request, accessToken, 'create_planned_payment', {
    ledger_id: shared?.id,
    title: 'e2e viewer plan',
    planned_amount_minor: 1000,
    due_on: '2030-01-15',
    confirm: true,
  })

  expect(answer.isError).toBe(true)
  expect(answer.text).toMatch(/only view/)
})
