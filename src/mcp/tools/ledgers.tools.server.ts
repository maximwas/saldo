import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { registerReadTool } from '../register-tool.server'
import { spaceInput } from '../tool-input.schema'

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
}
