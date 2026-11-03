/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-feature',
      comment: 'Фічі не імпортують одна одну; спільне — у src/lib, src/components, src/types',
      severity: 'error',
      from: { path: '^src/features/([^/]+)/' },
      to: {
        path: '^src/features/([^/]+)/',
        pathNot: '^src/features/$1/',
      },
    },
    {
      name: 'api-is-portable',
      comment: '*.api.ts викликається і з браузера, і з MCP-сервера (фаза 10)',
      severity: 'error',
      from: { path: '^src/features/[^/]+/api/[^/]+\\.api\\.ts$' },
      // no ^ before node_modules: pnpm resolves to node_modules/.pnpm/<pkg>@<v>/node_modules/<pkg>/
      to: { path: '(node_modules/(react|react-dom|next|@tanstack)/|^src/lib/supabase/browser-client)' },
    },
    {
      name: 'mcp-uses-portable-feature-code',
      comment: 'src/mcp бере з фіч лише api/*.api.ts, schemas/, utils/ і *.types.ts (conventions §3)',
      severity: 'error',
      from: { path: '^src/mcp/' },
      to: {
        path: '^src/features/',
        pathNot: '^src/features/[^/]+/(api/[^/]+\\.api\\.ts|schemas/|utils/|[^/]+\\.types\\.ts)',
      },
    },
    {
      name: 'nothing-imports-mcp',
      comment: 'MCP — шар композиції: фічі й src/lib його не імпортують',
      severity: 'error',
      from: { path: '^src/(features|lib|components|hooks|store|contexts)/' },
      to: { path: '^src/mcp/' },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
  },
}
