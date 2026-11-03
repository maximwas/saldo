import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { listMembers } from '@/features/ledgers/api/access.api'
import { registerReadTool } from '../register-tool.server'
import { spaceInput } from '../tool-input.schema'

function registerListMembers(server: McpServer) {
  registerReadTool(
    server,
    'list_members',
    {
      title: 'Members of a space',
      description:
        'Members of the space with their role (owner, editor, viewer), display name and join date; userId is what get_statistics member_id takes. Emails and invites stay in the app.',
      inputSchema: spaceInput,
    },
    async (_args, { supabase, ledger }) => ({ data: { members: await listMembers(supabase, ledger.id) } }),
  )
}

export function registerLedgersTools(server: McpServer) {
  registerReadTool(
    server,
    'list_ledgers',
    {
      title: 'Spaces',
      description:
        "The Saldo spaces (ledgers) the person is a member of, with their role: owner and editor may write, viewer only reads. Every other tool takes an optional ledger_id from here; the answer's ledger is the default one.",
      inputSchema: spaceInput,
    },
    async (_args, { ledgers }) => ({ data: { ledgers } }),
  )

  registerListMembers(server)
}
