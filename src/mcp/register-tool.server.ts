import 'server-only'
import type { McpServer, ToolAnnotations } from '@modelcontextprotocol/server'
import type { z } from 'zod'
import { type ToolBody, toolHandler } from './tool-context.server'

type ToolConfig<Schema extends z.ZodObject> = {
  title: string
  description: string
  inputSchema: Schema
}

function registerTool<Schema extends z.ZodObject>(
  server: McpServer,
  name: string,
  config: ToolConfig<Schema>,
  annotations: ToolAnnotations,
  body: ToolBody<z.infer<Schema>>,
) {
  server.registerTool(
    name,
    {
      ...config,
      annotations: {
        title: config.title,
        // Saldo tools never reach outside the caller's own data
        openWorldHint: false,
        ...annotations,
      },
    },
    // for a generic Schema TS cannot unify the SDK's InferOutput<Schema> with z.infer<Schema>, the same type
    toolHandler(name, body) as never,
  )
}

/** reads under the caller's RLS; clients (ChatGPT) run a read-only tool without asking */
export function registerReadTool<Schema extends z.ZodObject>(
  server: McpServer,
  name: string,
  config: ToolConfig<Schema>,
  body: ToolBody<z.infer<Schema>>,
) {
  registerTool(server, name, config, { readOnlyHint: true }, body)
}

/** adds a record through the app's own RPC: a preview unless confirm is true, the same id never writes twice */
export function registerWriteTool<Schema extends z.ZodObject>(
  server: McpServer,
  name: string,
  config: ToolConfig<Schema>,
  body: ToolBody<z.infer<Schema>>,
) {
  registerTool(
    server,
    name,
    config,
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    },
    body,
  )
}
