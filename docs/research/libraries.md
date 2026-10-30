# Бібліотеки: перевірка реєстру npm (30.10.2026)

Версія й дата — `npm view` (дата = `time.modified`, може бути пізнішою за реліз), завантаження — api.npmjs.org
за тиждень. Вердикт: adopt / alternative / reject.

| Пакет | Версія | Дата | Ліцензія | Завант./тиж | Вердикт | Примітка |
|---|---|---|---|---|---|---|
| next | 16.4.3 | 2026-10-29 | MIT | 91M | adopt | proxy.ts, Turbopack за замовчуванням |
| react / react-dom | 19.3.1 | 2026-10-29 | MIT | 246M | adopt | |
| typescript | **6.0.3** | — | Apache-2.0 | 402M | adopt | latest = 7.0.2 (нативний), сумісність із Next не підтверджена → беремо 6.0.3 |
| tailwindcss, @tailwindcss/postcss | 4.3.3 | 2026-10-19 | MIT | 170M | adopt | тема: docs/design/theme.css |
| shadcn (CLI) | 4.23.0 | 2026-10-27 | MIT | 16.6M | adopt | варіант Base UI |
| @base-ui/react | 1.9.0 | 2026-10-09 | MIT | 26M | adopt | стабільний Drawer; старе ім'я @base-ui-components/react |
| radix-ui | 1.8.1 | 2026-10-14 | MIT | 24.7M | alternative | shadcn більше не за замовчуванням |
| vaul | 1.1.2 | 2024-12-14 | MIT | 33M | reject | не підтримується; шторка — Base UI Drawer |
| lucide-react | 1.65.0 | 2026-10-30 | ISC | 130M | adopt | |
| sonner | 2.0.8 | 2026-08-09 | MIT | 56M | adopt | тости |
| cmdk | 1.1.1 | 2025-08-27 | MIT | 46M | adopt | ⌘K-пошук |
| react-day-picker | 10.0.2 | 2026-09-30 | MIT | 47M | adopt | вибір дати |
| motion | 14.8.0 | 2026-10-29 | MIT | 34M | adopt | лише відповідь на дії |
| class-variance-authority | 0.7.1 | 2024-11-26 | Apache-2.0 | 79M | adopt | стабільний, у шаблонах shadcn |
| clsx / tailwind-merge | 2.1.1 / 3.7.0 | 2026-09 / 2026-10 | MIT | 162M / 104M | adopt | `cn()` |
| tw-animate-css | 1.4.0 | 2026-02-28 | MIT | 46.6M | adopt | анімації shadcn |
| react-number-format | 5.4.5 | 2026-03-22 | MIT | 7.8M | adopt | поле суми |
| @supabase/supabase-js | 2.118.0 | 2026-10-28 | MIT | 51M | adopt | |
| @supabase/ssr | 0.12.7 | 2026-09-08 | MIT | 13M | adopt | ще 0.x |
| supabase (CLI) | 2.122.0 | 2026-10-30 | MIT | 7.8M | adopt | dev: міграції, типи, локальна БД |
| @tanstack/react-query (+devtools, persist-client, query-async-storage-persister) | 5.105.0 | 2026-10-26 | MIT | 81M | adopt | |
| idb-keyval | 6.3.0 | 2026-07-08 | Apache-2.0 | 14M | adopt | IndexedDB для persister |
| zustand | 5.0.16 | 2026-10-22 | MIT | 86M | adopt | UI-стан |
| nuqs | 2.10.2 | 2026-10-08 | MIT | 7.9M | adopt | фільтри в URL |
| react-hook-form | 7.91.0 | 2026-10-24 | MIT | 62.5M | adopt | |
| @hookform/resolvers | 6.0.2 | 2026-10-28 | MIT | 49.5M | adopt | peer zod ^3.25 \|\| ^4 |
| zod | 4.6.7 | 2026-10-12 | MIT | 446M | adopt | |
| @tanstack/react-form | 1.33.5 | 2026-10-23 | MIT | 5.8M | alternative | |
| decimal.js | 10.6.0 | 2025-07-06 | MIT | 133M | adopt | курси й відсотки з явним округленням |
| big.js / dinero.js | 7.0.1 / 2.0.2 | | MIT | 45M / 1M | alternative | dinero v2 стабільна, але зайва модель |
| date-fns, @date-fns/tz | 4.4.0, 1.5.0 | 2026-05 | MIT | 121M / 41.5M | adopt | `addMonths` сам обрізає 31-ше |
| rrule | 2.8.1 | 2023-11-10 | BSD-3 | 4.3M | reject | 3 роки без релізів, не потрібен |
| @tanstack/react-table | 9.3.1 | 2026-10-12 | MIT | 33.7M | adopt | таблиці desktop |
| recharts | 3.10.1 | 2026-10-29 | MIT | 64.5M | adopt | графіки (shadcn chart) |
| @fullcalendar/react | 7.1.3 | 2026-10-16 | MIT | 2.5M | alternative | календар — власна сітка на date-fns |
| @schedule-x/react | 4.1.0 | 2026-01-21 | MIT | 0.21M | reject | DnD платний |
| serwist, @serwist/turbopack | 9.5.13 | 2026-10-04 | MIT | 0.93M / 0.22M | adopt | офіційний шлях для Next 16 |
| @pushforge/builder | 2.0.5 | 2026-04-23 | MIT | 128K | adopt | Web Push на Web Crypto |
| web-push | 3.6.7 | 2024-01-16 | MPL-2.0 | 12.7M | alternative | ліцензія й 21 міс. без релізу |
| @googleapis/calendar | 20.1.0 | 2026-10-03 | Apache-2.0 | 1.2M | adopt | `googleapis` (188) — reject, величезний |
| tsdav | 2.5.0 | 2026-10-15 | MIT | 0.26M | adopt | iCloud CalDAV |
| browser-image-compression | 2.0.2 | 2023-03-06 | MIT | 1.9M | adopt* | старий, але без заміни; переглянути у фазі 1 |
| @t3-oss/env-nextjs | 0.13.11 | 2026-03-22 | MIT | 3.9M | adopt | env через zod |
| @biomejs/biome | 2.6.4 | 2026-10-28 | MIT/Apache | 25M | adopt | lint + format |
| vitest, @vitest/coverage-v8 | 5.0.5 | 2026-10-19 | MIT | 170M | adopt | Vite 8: `resolve.tsconfigPaths: true` |
| lefthook | 2.2.2 | 2026-10-13 | MIT | 8.7M | adopt | pre-commit |
| knip | 6.44.0 | 2026-10-29 | ISC | 26.8M | adopt | невикористаний код |
| dependency-cruiser | 18.7.0 | 2026-10-19 | MIT | 7.8M | adopt | межі фіч; Node `^22\|\|^24\|\|>=26` |
| @playwright/test | 1.64.1 | 2026-10-14 | Apache-2.0 | 104M | adopt | e2e: кілька контекстів (дві ролі), `setOffline`, `storageState`, `webServer`; офіційний гайд Next «Testing: Playwright» |
| cypress | 16.2.1 | 2026-10-28 | MIT | 8M | reject | один браузерний контекст на тест — дві людини одночасно незручно; без вбудованого офлайну |
| mcp-handler | 2.3.0 | 2026-10-07 | Apache-2.0 | 1.9M | adopt | фаза 10: Streamable HTTP у Next, `withMcpAuth`, PRM; peer `@modelcontextprotocol/server ^2`, zod ^4.2 |
| @modelcontextprotocol/server | 2.4.0 | 2026-10-23 | Apache-2.0 | 20.5M | adopt | фаза 10: офіційний SDK v2, `registerTool` з zod-схемою (Standard Schema) |
| @modelcontextprotocol/sdk | 1.32.2 | 2026-10-23 | MIT | 87M | reject | гілка 1.x; mcp-handler 2 вимагає v2 |
| @vercel/mcp-adapter | 0.3.2 | 2026-05-18 | — | 61K | reject | стара назва mcp-handler |
| @modelcontextprotocol/inspector | 2.13.0 | 2026-10-28 | див. LICENSE | 0.72M | dev, `npx` | перевірка сервера у фазі 10, не встановлюється |

## Відповіді на питання
- Serwist + Next 16: `@serwist/turbopack` (route `app/serwist/[path]/route.ts`, `createSerwistRoute`, `SerwistProvider`).
  https://serwist.pages.dev/docs/next/turbo — перевірено спільнотою на 16.2.
- RHF + zod 4: працює; для схем із `.default()` — `useForm<z.input<S>, any, z.output<S>>`; `valueAsNumber` дає NaN.
- Biome `useFilenamingConvention` з `["kebab-case"]` пропускає `account-card.component.tsx` (кожна частина між
  крапками перевіряється окремо). `noBarrelFile`, `noReExportAll` — вмикати. Межі між фічами — лише overrides
  `noRestrictedImports` на кожну фічу → беремо dependency-cruiser.
- tsdav + iCloud: `serverUrl: https://caldav.icloud.com/`, `defaultAccountType: "caldav"`; шардовані хости `pNN-caldav`.
- Playwright + Next 16: гайд Next (оновлений 15.10.2026) радить тести проти `next build && next start`; спільнота —
  холодна компіляція Turbopack у `next dev` дає таймаути першого тесту, змішаний `.next` після різних бандлерів —
  «не працює клієнтський JS» (видалити `.next`). `setOffline` у WebKit ламає навігацію під service worker
  (microsoft/playwright#42775), у Chromium — перевірити (#2311 закрито). Supabase у CI — повний `supabase start`, не
  `db start` (supabase discussion #32522); ключі з `supabase status -o env|json`, нові CLI — `PUBLISHABLE_KEY`/`SECRET_KEY`.
- Не перевірено: розміри бандлів, TS 7 із Biome/Next, Serwist на 16.4.
