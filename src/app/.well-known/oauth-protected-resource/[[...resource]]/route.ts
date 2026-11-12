import { getPublicOrigin, metadataCorsOptionsRequestHandler, protectedResourceHandler } from 'mcp-handler'
import { connection } from 'next/server'
import { supabaseAuthIssuer } from '@/mcp/auth.server'
import { MCP_PATH } from '@/mcp/mcp.constants'

// RFC 9728 for /api/mcp, at the path-inserted URL and the bare one: clients compare `resource` with the URL they were
// given (Gemini CLI exactly), so it is the MCP URL itself, not the origin
export async function GET(request: Request) {
  // the origin comes from the request: never prerendered at build time
  await connection()

  return protectedResourceHandler({
    authServerUrls: [supabaseAuthIssuer()],
    resourceUrl: new URL(MCP_PATH, getPublicOrigin(request)).href,
  })(request)
}

export const OPTIONS = metadataCorsOptionsRequestHandler()
