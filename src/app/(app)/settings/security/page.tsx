import { Suspense } from 'react'
import { listOAuthGrants } from '@/features/settings/api/oauth-grants.server'
import { AiAccessCard } from '@/features/settings/components/ai-access-card.component'
import { verifySession } from '@/lib/auth/dal.server'
import { env } from '@/lib/env'

// Settings → Security (plan 10.4): the AI clients allowed through Saldo's MCP server, each with «Revoke»
export default function SecuritySettingsPage() {
  return (
    <Suspense>
      <Grants />
    </Suspense>
  )
}

async function Grants() {
  await verifySession()

  const grants = await listOAuthGrants()

  return <AiAccessCard grants={grants} mcpUrl={`${env.NEXT_PUBLIC_SITE_URL}/api/mcp`} />
}
