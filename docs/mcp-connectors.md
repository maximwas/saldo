# Saldo в AI-клієнтах: MCP-конектори

Один remote MCP-сервер для всіх клієнтів: `https://saldo.maksymvasianin.com/api/mcp` (Streamable HTTP, stateless,
специфікація MCP 2026-07-28 і сумісність із клієнтами 2025 року). Вхід — OAuth 2.1 через Supabase Auth OAuth Server:
клієнт сам реєструється (Dynamic Client Registration), ви входите в Saldo і на сторінці згоди натискаєте «Дозволити».
Клієнт бачить рівно те, що й ви, з вашою роллю в кожному просторі (`docs/architecture.md` §12). Стан на 03.11.2026.

## Що вміє сервер
- **Читання** (завжди): `list_ledgers`, `get_available_to_date` (те саме число й складові, що на Огляді),
  `get_balances`, `list_upcoming`, `search_operations`, `list_subscriptions`, `list_credits`, `list_debts`,
  `get_budget_month` (будь-який місяць), `get_month_statistics`, `list_categories`, `get_currencies`, `search`;
  деталі одного запису — `get_subscription` (картка з історією цін і платежами), `get_credit` (з графіком внесків),
  `get_debt` (з рухами), `get_account` (з останніми 20 операціями), `get_operation` (що оплатила, скільки повернуто);
  `list_calendar` (факти й плани за період з тими самими фільтрами, що в Календарі), `get_statistics` (місяць, рік,
  3/6/12 місяців, «Хто»), `list_notifications`, `list_reminders` (правила нагадувань), `list_members` (ролі й імена
  учасників, без email).
- **Запис** — лише коли у Vercel `MCP_WRITE_ENABLED=true`: `add_operation`, `mark_paid`, `create_planned_payment`. Без
  `confirm: true` tool лише показує попередній перегляд; той самий `id` вдруге нічого не пише.
- **Ніколи**: видалення (тригер у БД відмовляє OAuth-токену навіть у прямому виклику Supabase), запис для viewer,
  запити назовні. Текст із даних (контрагенти, примітки, назви планів, особи боргів, кредитори, тексти сповіщень, імена учасників) приходить як `{"untrusted_text": …}`.
- Кожен виклик пишеться в `mcp_audit_log`. Видані доступи й «Відкликати» — Налаштування → Безпека; відкликання діє
  з наступного виклику клієнта.

## Перед першим підключенням (один раз, Максим, прод)
1. Supabase Dashboard → Authentication → OAuth Server: увімкнути OAuth 2.1 Server, Authorization Path
   `/oauth/consent`, увімкнути Dynamic Client Registration. Authentication → URL Configuration: Site URL
   `https://saldo.maksymvasianin.com`.
2. Project Settings → JWT Keys: поточний ключ підпису має бути асиметричним (ECC P-256 або RSA). ChatGPT просить
   scope `openid`, а ID-токен на HS256 Supabase не видає.
3. Перевірка: `curl https://<ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1` → 200 з
   `registration_endpoint`; і `curl -i https://saldo.maksymvasianin.com/api/mcp -X POST` → 401 з `resource_metadata`.
4. Міграція `20261103165324_mcp_audit_log` — `supabase db push` разом із релізом фази.
5. Vercel Firewall: `/api/mcp` і `/.well-known/*` без челенджів (Attack Mode, Bot Protection) — клієнти ходять із
   серверів Anthropic (`160.79.104.0/21`), OpenAI, Perplexity.

## Claude (claude.ai, Claude Desktop, мобільний)
1. Settings → Connectors → **Add custom connector**.
2. Name `Saldo`, URL `https://saldo.maksymvasianin.com/api/mcp`, Advanced settings не чіпати → **Add**.
3. **Connect** → відкриється Saldo: увійти → «Дозволити».
4. У чаті: меню інструментів → увімкнути Saldo.

Плани: Free (один власний конектор), Pro, Max, Team / Enterprise (додає власник організації). Callback
`https://claude.ai/api/mcp/auth_callback` (і `claude.com`). Обмеження: 10 с на discovery, реєстрацію й токен; доданий
з вебу конектор з'являється й у Desktop та мобільному.

## Claude Code
```sh
claude mcp add --transport http saldo https://saldo.maksymvasianin.com/api/mcp
```
У сесії `/mcp` → `saldo` → Authenticate → браузер → «Дозволити». Callback — `http://localhost:<порт>/callback`.
Кожен новий вхід реєструє нового клієнта (DCR): старі видно в Supabase → Authentication → OAuth Apps, їх можна
прибрати. Якщо після чистки `/mcp` повторює мертвий клієнт — `/mcp` → Clear authentication або `claude mcp remove
saldo` і додати знову.

## ChatGPT
1. Settings → Apps & Connectors → Advanced settings → **Developer mode** увімкнути.
2. Apps & Connectors → **Create**: назва `Saldo`, URL сервера, Authentication **OAuth** → Create.
3. Connect → увійти в Saldo → «Дозволити». Після зміни tools — Refresh у налаштуваннях конектора.

Плани: Plus, Pro, Business, Enterprise, Edu, лише веб. Callback `https://chatgpt.com/connector/oauth/<id>` (або
`connector_platform_oauth_redirect`). Read-tools позначені `readOnlyHint` і виконуються без питань; write-tools
ChatGPT підтверджує окремо. Deep research і «company knowledge» беруть лише tools `search` + `fetch` у форматі
OpenAI — їх немає, Saldo працює в звичайному чаті з developer mode.

## Perplexity
1. Settings → Connectors (Plugins) → Add custom → **Add MCP connector** → Remote.
2. URL сервера, транспорт Streamable HTTP, Authentication **OAuth** → Add → Connect → «Дозволити».
3. У новому чаті увімкнути конектор Saldo в джерелах.

Плани: Pro, Max, Enterprise (в Enterprise вмикає адмін). Callback
`https://www.perplexity.ai/rest/connections/oauth_callback` (`enterprise.` для Enterprise). Метадані сервера
авторизації Perplexity шукає на домені MCP — `/.well-known/oauth-authorization-server` їх віддає.
**Відома проблема (з травня 2026):** DCR Perplexity реєструє публічного клієнта, а потім чекає `client_secret` і
падає з «did not return a client_secret». Обхід: Supabase → Authentication → OAuth Apps → Add client (confidential,
redirect URI — callback вище), у Perplexity в Advanced ввести Client ID і Client Secret.

## Gemini
- **Gemini CLI** — `~/.gemini/settings.json`:
  ```json
  { "mcpServers": { "saldo": { "httpUrl": "https://saldo.maksymvasianin.com/api/mcp" } } }
  ```
  Потім `gemini` → `/mcp auth saldo` → браузер → «Дозволити». Callback — loopback (`http://localhost:<порт>/oauth/callback`,
  закріпити: `"oauth": { "redirectUri": "http://localhost:7777/oauth/callback" }`). Gemini CLI суворо порівнює
  `resource` із URL — сервер віддає саме `…/api/mcp`. Особисті акаунти Free / Pro / Ultra з 18.06.2026 переведено на
  Antigravity CLI (`agy`); його формат конфігу не перевірено.
- **Застосунок Gemini** (gemini.google.com): Settings → Connected apps → Custom apps — лише особистий акаунт, США,
  англійська; DCR. Callback не задокументований: сторінка згоди Saldo покаже «невідомий клієнт» і не дасть доступ,
  доки його callback не додано до списку в `src/features/auth/utils/oauth-redirect.utils.ts`.
- **Gemini Enterprise**: лише адмін, ручний OAuth без DCR, callback `https://vertexaisearch.cloud.google.com/oauth-redirect`
  — не для особистого Saldo, у списку дозволених його немає.

## MCP Inspector
```sh
npx @modelcontextprotocol/inspector@2.13.0
```
URL сервера, Transport Streamable HTTP → Connect → OAuth → «Дозволити». Callback `http://localhost:6274/oauth/callback`
(CLI / TUI — `127.0.0.1:6276`). Inspector 2 ходить до сервера зі свого Node-бекенду, тож CORS для `/api/mcp` не
потрібен. Без браузера: `npx @modelcontextprotocol/inspector@2.13.0 --cli <url> --method tools/list` (OAuth просить
TTY).

## Інші
- **Mistral Le Chat**: Connectors → Custom MCP (адмін робочого простору) → URL → OAuth з DCR; callback
  `https://callback.mistral.ai/v1/integrations_auth/oauth2_callback` у списку дозволених (з GitHub-issue, не з доків).
- **Microsoft Copilot**: лише Copilot Studio, і там не передає `resource`; зараз не підтримується.

## Обмеження й відомі питання
- Supabase OAuth Server — beta; CIMD (`client_id_metadata_document_supported`) не публікує, тож усі клієнти йдуть
  через DCR. DCR дозволяє зареєструватися будь-кому: захист — вхід лише власника, згода й список дозволених
  callback на сторінці згоди.
- Supabase порівнює redirect URI буквально, без винятку для loopback-портів: клієнт із випадковим портом
  реєструється заново (так і роблять Claude Code та Gemini CLI).
- Відповідь tool — до 60 000 символів; пошук операцій — до 100 рядків.
- Токен доступу живе годину, клієнт оновлює його refresh-токеном; відкликання в Налаштуваннях зупиняє одразу.
- Локально OAuth-сервер вмикається в `supabase/config.toml` і працює після `supabase stop && supabase start`; до того
  OAuth-частина `e2e/mcp` пропускається.
