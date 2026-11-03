import { expect } from '@playwright/test'
import { callTool, connectMcpClient, oauthServerOn } from '../fixtures/mcp.fixture'
import { test } from '../fixtures/roles.fixture'

const OAUTH_OFF =
  'the local OAuth 2.1 server is off: restart the stack (supabase stop && supabase start) after config.toml'

type SubscriptionRow = {
  id: string
  name: string
  categoryId: string | null
}

type CategoryRow = {
  id: string
  systemKey: string | null
}

// the write tools beyond plan 10.8: the same guards as add_operation, shown on the subscription the app adds most
test('create_subscription: прев’ю нічого не пише, confirm — одна підписка в «Підписки», повтор нічого не додає', async ({
  pageAs,
  request,
  baseURL,
}) => {
  test.skip(!(await oauthServerOn()), OAUTH_OFF)

  const name = `e2e-${crypto.randomUUID().slice(0, 8)}`
  const owner = await pageAs('owner')
  const { accessToken } = await connectMcpClient(owner, request, baseURL ?? '')
  const balances = await callTool(request, accessToken, 'get_balances')
  const account = (
    balances.data.accounts as {
      id: string
      archivedAt: string | null
    }[]
  ).find((item) => item.archivedAt === null)
  const named = async () =>
    ((await callTool(request, accessToken, 'list_subscriptions')).data.subscriptions as SubscriptionRow[]).filter(
      (item) => item.name === name,
    )
  const preview = await callTool(request, accessToken, 'create_subscription', {
    name,
    amount_minor: 19900,
    account_id: account?.id,
  })
  const confirmArguments = preview.data.confirmArguments as { id: string }

  expect(preview.data.preview).toBe(true)
  expect(await named()).toHaveLength(0)
  expect((await callTool(request, accessToken, 'create_subscription', confirmArguments)).isError).toBe(false)

  const replay = await callTool(request, accessToken, 'create_subscription', confirmArguments)

  expect(replay.isError).toBe(false)
  expect(replay.data.alreadyWritten).toBeTruthy()

  const rows = await named()
  const categories = (await callTool(request, accessToken, 'list_categories')).data.categories as CategoryRow[]

  expect(rows).toHaveLength(1)
  expect(rows[0].id).toBe(confirmArguments.id)
  expect(rows[0].categoryId).toBe(categories.find((item) => item.systemKey === 'subscriptions')?.id)
})

test('нові write-tools з токеном viewer відмовляють ще до прев’ю', async ({ pageAs, request, baseURL }) => {
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

  for (const confirm of [false, true]) {
    const answer = await callTool(request, accessToken, 'create_subscription', {
      ledger_id: shared?.id,
      name: 'e2e viewer subscription',
      amount_minor: 9900,
      account_id: crypto.randomUUID(),
      confirm,
    })

    expect(answer.isError, `confirm ${confirm}`).toBe(true)
    expect(answer.text).toMatch(/only view/)
  }
})
