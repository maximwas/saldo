import 'server-only'
import type { McpServer } from '@modelcontextprotocol/server'
import { listNotifications } from '@/features/notifications/api/notifications.api'
import { listMyReminders } from '@/lib/reminders/reminder-rules.api'
import { registerReadTool } from '../register-tool.server'
import { spaceInput } from '../tool-input.schema'

export function registerNotificationsTools(server: McpServer) {
  registerReadTool(
    server,
    'list_notifications',
    {
      title: 'Notifications',
      description:
        "The person's own Saldo notifications of every space they are in, newest first (up to 100); readAt null = unread. Reading them here marks nothing read.",
      inputSchema: spaceInput,
    },
    async (_args, { supabase }) => ({ data: { notifications: await listNotifications(supabase) } }),
  )

  registerReadTool(
    server,
    'list_reminders',
    {
      title: 'Reminder rules',
      description:
        'Enabled reminder rules of the space for subscriptions, credits and debts: how many days before a due date (offsetsDays), at what time, and the unpaid due dates they fire for. Rules are changed in the app only.',
      inputSchema: spaceInput,
    },
    async (_args, { supabase, ledger }) => ({ data: { reminders: await listMyReminders(supabase, ledger.id) } }),
  )
}
