import 'server-only'
import type { McpServer, ToolAnnotations } from '@modelcontextprotocol/server'
import type { z } from 'zod'
import { findEarlierWrite, type ToolBody, type ToolContext, toolHandler } from './tool-context.server'
import { assertPreviewVersion, toPreview } from './tool-result.utils'
import { assertWriter } from './write-checks.server'

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

/** one write through the app's own api: the preview shows willWrite, a confirm runs write */
export type WritePlan = {
  willWrite: Record<string, unknown>
  /** the arguments with every generated id filled in: sent back with confirm true they make exactly this write */
  replayArgs: object
  createdIds?: string[]
  /** an edit: the version of the record it is made from (null = none yet); a confirm must send the same one back */
  version?: number | null
  write: () => Promise<unknown>
}

type Planner<Args> = (args: Args, context: ToolContext) => WritePlan | Promise<WritePlan>

const REPEAT_HINT =
  'An identical call already wrote this, so nothing was written again. For a second, separate write, call without confirm for a new preview.'

function confirmedBody<Args extends object>(name: string, plan: Planner<Args>): ToolBody<Args> {
  return async (args, context) => {
    assertWriter(context)

    const { confirm } = args as { confirm?: boolean }
    const earlier = confirm ? await findEarlierWrite(context, name, args) : null

    if (earlier) {
      return {
        data: { alreadyWritten: REPEAT_HINT },
        createdIds: earlier,
      }
    }

    const { willWrite, replayArgs, createdIds, version, write } = await plan(args, context)

    if (!confirm) {
      const confirmArgs =
        version === undefined
          ? replayArgs
          : {
              ...replayArgs,
              version,
            }

      return {
        preview: true,
        data: toPreview(name, willWrite, confirmArgs),
      }
    }

    // a versioned app update gets this same version, so the DB still refuses a change landing after this check
    if (version !== undefined) {
      assertPreviewVersion((args as { version?: number | null }).version, version)
    }

    const result = await write()

    return {
      data: {
        written: willWrite,
        result,
      },
      createdIds,
    }
  }
}

export type Registrar = (server: McpServer) => void

/** a write tool for server.server.ts: a viewer is refused, no confirm = a preview, an identical confirmed call is
 * answered from mcp_audit_log; destructive = it changes or ends an existing record, not only adds one */
export function confirmedWriteTool<Schema extends z.ZodObject>(
  name: string,
  config: ToolConfig<Schema> & { destructive: boolean },
  plan: Planner<z.infer<Schema>>,
): Registrar {
  const { destructive, ...toolConfig } = config
  const versioned = 'version' in toolConfig.inputSchema.shape
  const described = {
    ...toolConfig,
    description: `${toolConfig.description} Without confirm true it only returns a preview and writes nothing.${versioned ? ' A confirmed edit needs the version from its preview.' : ''}`,
  }

  return (server) =>
    registerTool(
      server,
      name,
      described,
      {
        readOnlyHint: false,
        destructiveHint: destructive,
        idempotentHint: true,
      },
      confirmedBody(name, plan),
    )
}
