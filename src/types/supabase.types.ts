import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// One client type for the browser, the server and the MCP server (phase 10): *.api.ts take it as the first parameter
export type SaldoClient = SupabaseClient<Database>

export type LedgerRole = 'owner' | 'editor' | 'viewer'
