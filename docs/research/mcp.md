# MCP-сервер: транспорт, автентифікація, tools (дослідження 30.10.2026)

Що треба: Максим працює з даними Saldo з Claude Code і Perplexity. MCP-сервер — фаза 10, після всіх
інших. Код фаз 0–9 має бути таким, щоб сервер просто склав готові частини: схеми, функції `*.api.ts`,
RPC, чисті утиліти. Версії пакетів — `npm view` (дата = `time.modified`), завантаження — api.npmjs.org за
тиждень 22–28.10.2026.

## Рішення
- **Один remote-сервер Streamable HTTP**, Route Handler `src/app/api/mcp/route.ts` у тому самому
  Next-застосунку на Vercel (fra1). Він stateless, без Redis і без SSE. Локального stdio-сервера немає.
- **Бібліотеки:** `mcp-handler` 2.3.0 + `@modelcontextprotocol/server` 2.4.0, zod 4.6.7 уже є.
  Беру готове: транспорт, перевірку bearer-токена й 401 з `WWW-Authenticate`, Protected Resource Metadata
  (`withMcpAuth`, `protectedResourceHandler`), а також JSON Schema з zod, яку SDK будує сам зі Standard
  Schema. Сам пишу лише реєстрацію tools: кожен tool — тонкий клей між zod-схемою вводу фічі, її
  функцією `*.api.ts` і чистою утилітою. Протокол і OAuth уже є готові, власна логіка — тільки домен.
- **Автентифікація: OAuth 2.1 через Supabase Auth OAuth Server** (beta, є на Free без доплати; MCP-клієнти
  рахуються як MAU тієї самої людини). Сервер видає звичайний Supabase JWT із `sub` учасника й `client_id`.
  Route Handler створює supabase-js з цим токеном у заголовку `Authorization`, тож RLS і `security
  invoker` RPC працюють так само, як із браузера. Service-role для MCP не потрібен.
- **Запис вимкнений за замовчуванням.** Write-tools реєструються лише при `MCP_WRITE_ENABLED=true`. Кожен
  такий tool спершу повертає попередній перегляд і змінює дані тільки з `confirm: true`.
- **Учасники просторів (ADR 19, 30.10.2026).** Токен MCP належить учаснику, а не простору: кожна людина
  підключає MCP своїм входом і згодою, тож `sub` у JWT — вона. Токен діє в межах її ролі в кожному просторі
  (ті самі функції членства й RLS, що в UI): viewer лише читає, відкликаний учасник втрачає доступ з
  наступного виклику, бо членства немає в JWT. Tool `list_ledgers` повертає простори з роллю, решта tools
  беруть необов'язковий `ledger_id`. Журнал `mcp_audit_log` пише автора (`user_id`), простір і `client_id`;
  записи через MCP мають `created_by` цього учасника. URL: `https://saldo.maksymvasianin.com/api/mcp`.

## Клієнти: що підтримують (жовтень 2026)
| Клієнт | Транспорт | Auth | Що з цього випливає |
|---|---|---|---|
| Claude Code | `claude mcp add --transport http <name> <url>`; stdio | OAuth (DCR за замовчуванням, CIMD, `--client-id`/`--client-secret`), або `--header "Authorization: Bearer …"`; у `.mcp.json` — `${VAR}` у headers | годиться OAuth через `/mcp` |
| Perplexity (web, Mac, Windows) | remote: Streamable HTTP або SSE, лише `https://` | None / API Key / OAuth 2.0; Client ID + Secret потрібні, якщо сервер не вміє DCR; endpoints знаходить через `/.well-known/oauth-authorization-server`; callback `https://www.perplexity.ai/rest/connections/oauth_callback` | потрібна DCR і AS-metadata на нашому домені; власних заголовків форма не має |
| Perplexity, локальні MCP | stdio, лише Mac-застосунок з App Store + helper PerplexityXPC | — | не потрібно, remote покриває все |
| Comet (браузер Perplexity) | custom connectors не підтримує, лише вбудований каталог | — | не підходить |

Perplexity: custom remote connectors з 13.03.2026, плани Pro / Max / Enterprise; Free — ні. У жовтні
меню перенесли в «Plugins → Add custom → Connector → Add MCP connector». Спільнота скаржиться на
нестабільну форму, а в треді ha-mcp конектор доводилося вмикати вручну в кожному чаті.

**Обидва клієнти покриває один сервер з OAuth + DCR.** На домені Saldo для цього потрібні три речі:
1. `/.well-known/oauth-protected-resource` (RFC 9728, MUST за специфікацією MCP), де
   `authorization_servers` вказує на Supabase Auth;
2. `/.well-known/oauth-authorization-server` — копія метаданих Supabase Auth (проксі з кешем). Perplexity і
   claude.ai (issue claude-ai-mcp#82) шукають їх на домені MCP-сервера, а не за `authorization_servers`;
3. сторінка згоди `/oauth/consent`, яку вимагає Supabase OAuth Server: показує клієнта, scope і кнопки
   «Дозволити» / «Відмовити».

Різниця між клієнтами — лише куди вводиться URL і що Perplexity не передає власних заголовків. Якщо
OAuth у Perplexity не запрацює, план Б — персональний токен (нижче).

## Транспорт і хостинг: варіанти
| Варіант | За | Проти | Вердикт |
|---|---|---|---|
| `mcp-handler` у Next на Vercel | той самий деплой, env, DAL; офіційний шаблон Vercel; v2 обслуговує spec 2026-07-28 і stateless-fallback для старих клієнтів | Vercel Labs, Apache-2.0 | **беремо** |
| `@modelcontextprotocol/server` + `@modelcontextprotocol/node` напряму | без посередника | Next-адаптер, 401 і PRM довелося б писати самим | ні: це той клей, який mcp-handler уже дає |
| `@modelcontextprotocol/sdk` 1.x | 87M завантажень | гілка 1.x; mcp-handler 2 і Supabase MCP перейшли на v2 | ні |
| Локальний stdio | без мережі й OAuth | Perplexity — лише Mac App Store; секрет живе на диску; другий процес | ні |
| Supabase Edge Functions (гайд «BYO MCP») | поруч із БД | другий рантайм, Deno; zod-схеми й утиліти з `src/` не діляться | ні |

Vercel Hobby: Fluid compute, функція до 300 с, тіло запиту до 4.5 МБ (це обмежує імпорт PDF через MCP).
Stateless Streamable HTTP відповідає JSON на кожен POST і не тримає з'єднання, тож тривалість не
проблема. `export const runtime = 'nodejs'`, `maxDuration` за потреби — у `route.ts` (у mcp-handler 2
опцію `maxDuration` прибрали).

## Автентифікація: варіанти
| Варіант | RLS від імені власника | Claude Code | Perplexity | Вердикт |
|---|---|---|---|---|
| Supabase OAuth 2.1 Server + DCR | так, токен — Supabase JWT | так (`/mcp`) | так (OAuth) | **беремо** |
| Персональний токен (хеш SHA-256 у таблиці) | ні напряму: токен не JWT. Потрібен або service-role з ручним `user_id` (порушує правило), або власний підписаний JWT (див. «Не перевірено») | так (`--header`) | так (API Key; назва заголовка не задокументована) | план Б |
| Clerk / Auth0 / WorkOS | другий провайдер, JWT не прийме RLS без налаштування Third-party Auth | так | так | ні |
| Без auth, «секретний» URL | — | — | так | ні, це фінансові дані |

Специфікація MCP 2026-07-28: сервер — OAuth 2.1 resource server, PRM — MUST. Клієнти реєструються через
Client ID Metadata Documents (SHOULD) або pre-registration; **DCR deprecated, але лишена для сумісності**.
Supabase зараз документує саме DCR, а Perplexity — DCR або Client ID/Secret, тож DCR вмикаємо.
Обмеження DCR: будь-хто може зареєструвати клієнта. Пом'якшення: реєстрація в Supabase вимкнена, вхід —
лише пароль власника + TOTP, а згоду дає тільки він.

Додатковий захист у БД, який не потребує змін у фазах 0–9: restrictive-політики на `auth.jwt() ->>
'client_id'`. Наприклад, `delete` дозволений лише сесії застосунку (`client_id is null`), а MCP-клієнту —
ні. RPC `security invoker`, тому це діє і всередині них.

## Tools і resources (v1)
Читання, `readOnlyHint: true`, увімкнене завжди:
- `get_balances` — `account_balances` + `account_free_balances`;
- `get_available_to_date(date)` — `available-money.utils.ts` зі складовими (як на Огляді);
- `list_upcoming(days)` — `obligation_states`: план, стан, залишок; невідома сума = `null`;
- `search_operations(filter)` — keyset, фільтри як у списку, ліміт 100 рядків;
- `list_subscriptions`, `list_credits`, `get_budget_month(month)`, `get_calendar(from, to)`
  (`calendar_entries`), `search(q)` (`search_entities`).
Resources: `saldo://accounts`, `saldo://categories`, `saldo://settings` (валюта, часовий пояс), щоб
модель знала id і не вигадувала їх.

Запис (`MCP_WRITE_ENABLED`, `destructiveHint` там, де треба):
- `add_operation` → `create_operation` RPC; `id` генерує сервер, повтор із тим самим `id` дубля не дасть;
- `mark_paid(obligation_id, …)` → `pay_obligation`; прив'язати наявну операцію — пріоритет;
- `create_planned_payment` → `obligations`;
- `import_statement_preview(attachment_id)` → лише розбір і зіставлення з наявними операціями
  (дублі, кандидати оплат); застосування — тим самим шляхом, що й імпорт у UI, з `confirm: true`.
Небезпечні дії: видалення, архівація, зміна графіка кредиту, підтвердження податку, імпорт. У v1 вони
або відсутні, або тільки з `confirm: true`. Кожен виклик пишеться в `mcp_audit_log` (час, `client_id`,
tool, хеш вводу, результат, id створених записів); таблиця має RLS і відкривається в Налаштуваннях →
Безпека.

## Ризики
1. **Prompt injection з виписок.** Описи операцій, контрагенти й примітки — чужий текст, що потрапляє в
   контекст моделі. Perplexity і Claude Code мають веб-доступ, тож канал витоку існує. Пом'якшення: tools
   повертають структурований JSON, а вільний текст іде в полях `untrusted_text` з поясненням в описі tool;
   запис — лише з `confirm: true` і за замовчуванням вимкнений; tools не роблять запитів назовні;
   обмеження розміру відповіді (Claude Code попереджає з 10k токенів).
2. **Supabase OAuth Server у beta.** Пом'якшення: план Б (персональний токен), сам MCP-код від цього не
   залежить — змінюється лише `verifyToken`.
3. **Застарілий DCR client_id у Claude Code** (claude-code#84614, supabase/mcp#355): після чистки
   реєстрацій у Supabase `/mcp` повторює мертвий `client_id`. Обхід — видалити запис із Keychain,
   `claude mcp logout <name>`.
4. **Perplexity нестабільний:** форма конекторів, «authorization failed» на чужих серверах, план Pro+.
   Перевіряється живцем у фазі 10 до того, як писати write-tools.
5. **Сон Supabase Free** не впливає: MCP — додаткові запити, БД тримає активною щоденний cron.

## Не перевірено
- Чи публікує Supabase Auth `client_id_metadata_document_supported` (CIMD); тест — `GET
  https://<ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1`.
- Як Perplexity передає API Key (`Authorization: Bearer` чи інший заголовок) і чи читає він PRM, а не лише
  `/.well-known/oauth-authorization-server`.
- План Б: чи можна на Supabase Free підписати власний короткий JWT для RLS (імпортований ключ підпису
  або legacy JWT secret) — це потрібно, щоб персональний токен не вимагав service-role.
- Завантаження на тиждень для `@modelcontextprotocol/inspector` тут не важливе: запускається через `npx`.

## Джерела
- MCP Authorization 2026-07-28: https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
- Огляд CIMD/DCR: https://www.scalekit.com/blog/mcp-authorization-guide
- mcp-handler: https://github.com/vercel/mcp-handler · docs/AUTHORIZATION.md · https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel
- Шаблон: https://github.com/vercel-labs/mcp-for-next.js
- Supabase OAuth Server для MCP: https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication ·
  https://supabase.com/docs/guides/auth/oauth-server/token-security · https://supabase.com/pricing
- Claude Code MCP: https://code.claude.com/docs/en/mcp
- Perplexity: https://www.perplexity.ai/help-center/en/articles/13915507-adding-custom-remote-connectors ·
  https://docs.perplexity.ai/docs/agent-api/tools/connectors · https://skryvo.ai/blog/perplexity-mcp/ ·
  https://www.conductor.com/docs/mcp/perplexity
- Спільнота: https://github.com/homeassistant-ai/ha-mcp/discussions/779 (Perplexity),
  https://github.com/anthropics/claude-ai-mcp/issues/82 (AS-metadata на домені MCP),
  https://github.com/anthropics/claude-code/issues/84614 і https://github.com/supabase/mcp/issues/355 (stale DCR)
