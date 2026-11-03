import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { verifySupabaseToken } from '@/mcp/auth.server'
import { RESOURCE_METADATA_PATH } from '@/mcp/mcp.constants'
import { registerSaldoTools, SERVER_INSTRUCTIONS } from '@/mcp/server.server'

// Remote MCP server (phase 10, architecture section 12): stateless Streamable HTTP, a Supabase OAuth token required
// (401 + WWW-Authenticate resource_metadata without one), every tool under the caller's RLS
const handler = withMcpAuth(
  createMcpHandler(registerSaldoTools, {
    serverInfo: {
      name: 'saldo',
      version: '0.10.0',
    },
    instructions: SERVER_INSTRUCTIONS,
  }),
  verifySupabaseToken,
  {
    required: true,
    resourceMetadataPath: RESOURCE_METADATA_PATH,
  },
)

export { handler as DELETE, handler as GET, handler as POST }
