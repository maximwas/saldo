/** the MCP endpoint, its RFC 9728 resource identifier is this URL on the site's origin */
export const MCP_PATH = '/api/mcp'

/** RFC 9728 path insertion for MCP_PATH; the bare /.well-known/oauth-protected-resource serves the same document */
export const RESOURCE_METADATA_PATH = `/.well-known/oauth-protected-resource${MCP_PATH}`
