# Saldo: стек

Версії — з `docs/research/libraries.md` (npm, 30.10.2026). Під час встановлення у фазі 0 фіксуються точні версії
в `package.json` (без `^` для next, react, typescript, supabase-js). Ліцензії всі MIT / ISC / Apache-2.0 / BSD.

## Фреймворк і мова

| Пакет | Версія | Навіщо | Відкинуто |
|---|---|---|---|
| next | 16.4.3 | App Router, `proxy.ts`, Turbopack, Route Handlers для cron і інтеграцій | — |
| react, react-dom | 19.3.1 | | — |
| typescript | 6.0.3 | | 7.0.2 (нативний): сумісність із Next і Biome не підтверджена |
| next-intl | 4.14.9 (MIT, 02.10.2026) | локалізація `uk` / `en` без i18n-маршрутизації, типізовані ключі, `useFormatter` (ADR 25) | `[locale]`-маршрутизація; react-i18next (без RSC) |
| negotiator | 1.1.0 (MIT, 20.08.2026; типи `@types/negotiator`) | вибір мови з `Accept-Language` (q-значення, `en-US` → `en`) | власний парсер заголовка |

## UI

| Пакет | Версія | Навіщо | Відкинуто |
|---|---|---|---|
| tailwindcss, @tailwindcss/postcss | 4.3.3 | тема — лише `docs/design/theme.css` | — |
| shadcn (CLI) | 4.23.0 | генерація примітивів у `src/components/ui` | — |
| @base-ui/react | 1.9.0 | основа shadcn, Drawer для шторок mobile | radix-ui 1.8.1 (більше не дефолт shadcn), vaul (не підтримується) |
| next-themes | 0.4.6 (березень 2025, стабільний; інших оновлень немає) | `data-theme` light / dark / system (theme.css) | власний скрипт теми |
| lucide-react | 1.65.0 | іконки (ті самі, що в Figma) | — |
| sonner | 2.0.8 | тости | — |
| cmdk | 1.1.1 | пошук ⌘K | — |
| react-day-picker | 10.0.2 | вибір дати | — |
| motion | 14.3.0 (MIT, 15.10.2026; 14.4+ молодші за два тижні) | анімації лише як відповідь на дію: плашка SegmentedControl (`layoutId`), поява сторінки (`useAnimate`), `MotionConfig reducedMotion="user"` (ADR 27) | View Transitions (`<ViewTransition>` + `experimental.viewTransition` — експериментальні в Next 16.4); лише CSS (ширина плашки потребує вимірювання); next-transition-router |
| class-variance-authority | 0.7.1 | варіанти компонентів | — |
| cn | 0.5.0 (MIT, shadcn) | `cn()` через `createCn` з токенами теми; shadcn CLI 4.23 генерує саме його | clsx + tailwind-merge (cn — їх drop-in заміна) |
| tw-animate-css | 1.4.0 | анімації shadcn | — |
| react-number-format | 5.4.5 | поле суми, числова клавіатура mobile | — |
| @tanstack/react-table | 9.3.1 | таблиці desktop | — |
| recharts | 3.10.1 | діаграми статистики (shadcn chart) | — |
| календарна сітка | — | власна на date-fns | @fullcalendar/react (зайва вага), @schedule-x/react (DnD платний) |

## Дані й стан

| Пакет | Версія | Навіщо | Відкинуто |
|---|---|---|---|
| @supabase/supabase-js | 2.118.0 | PostgREST, rpc, Storage, Auth | Firebase SDK |
| @supabase/ssr | 0.12.7 | cookie-сесія для Next | — |
| @tanstack/react-query, -devtools, -persist-client, query-async-storage-persister | 5.105.0 | серверний стан, офлайн-черга мутацій | SWR (немає черги мутацій) |
| idb-keyval | 6.3.0 | IndexedDB для persister і чернеток | localStorage (ліміт 5 МБ, синхронний) |
| zustand | 5.0.16 | UI-стан у `src/store` | — |
| nuqs | 2.10.2 | фільтри й шторки в URL | — |
| react-hook-form | 7.91.0 | форми | @tanstack/react-form 1.33.5 (alternative) |
| @hookform/resolvers | 6.0.2 | zodResolver | — |
| zod | 4.6.7 | схеми форм, env, вхід RPC на клієнті | — |
| @t3-oss/env-nextjs | 0.13.11 | типізовані env, розділ server/client | — |
| pino | 10.4.0 (MIT, 02.10.2026) | серверні логи: JSON у проді, `redact`, child-логери (ADR 26) | LogTape 2.4.2, consola 3.4.2 (без релізів з 03.2025), next-logger 5.0.2 |
| pino-pretty | 13.2.0 (MIT, 04.10.2026) | читабельні логи в dev, потік у тому ж процесі (без transport) | — |
| @vercel/analytics | 2.0.1 (MIT, 02.10.2026) | Vercel Web Analytics без cookies; `beforeSend` відрізає query string, Vercel бачить лише шлях | — |
| @vercel/speed-insights | 2.0.0 (Apache-2.0, 03.07.2026) | Core Web Vitals з реальних пристроїв, той самий `beforeSend` | — |

## Домен

| Пакет | Версія | Навіщо | Відкинуто |
|---|---|---|---|
| decimal.js | 10.6.0 | курси, відсотки податку, явне округлення | big.js 7.0.1, dinero.js 2.0.2 (зайва модель грошей) |
| date-fns, @date-fns/tz | 4.4.0, 1.5.0 | повторення, короткі місяці, часовий пояс користувача | rrule 2.8.1 (3 роки без релізів) |
| browser-image-compression | 2.0.2 | стиснення фото чека | — (старий, заміни немає; переглянути у фазі 1) |

## PWA, сповіщення, інтеграції

| Пакет | Версія | Навіщо | Відкинуто |
|---|---|---|---|
| serwist, @serwist/turbopack | 9.5.13 | service worker для Next 16 + Turbopack | next-pwa (без Turbopack) |
| @pushforge/builder | 2.0.5 | Web Push (VAPID) на Web Crypto | web-push 3.6.7 (MPL-2.0, 21 міс. без релізу) |
| @googleapis/calendar | 20.1.0 | Google Calendar API v3 | googleapis (величезний) |
| tsdav | 2.5.0 | iCloud CalDAV | — |

## Інструменти розробки

| Пакет / інструмент | Версія | Навіщо |
|---|---|---|
| @biomejs/biome | 2.6.4 | lint + format (`next lint` прибрано в Next 16) |
| eslint, @stylistic/eslint-plugin, typescript-eslint | 10.13.0, 5.10.0, 8.72.1 (MIT) | лише правила стилю, яких немає в Biome 2.6: `id-length`, `padding-line-between-statements`, коментарі англійською (conventions §3a) |
| vitest, @vitest/coverage-v8 | 5.0.5 | unit-тести чистого ядра |
| lefthook | 2.2.2 | pre-commit |
| knip | 6.44.0 | невикористані файли, експорти, залежності |
| dependency-cruiser | 18.7.0 (MIT) | правило «фічі не імпортують одна одну», `api-is-portable` |
| @playwright/test | 1.64.1 (Apache-2.0) | e2e проти локального Supabase і `next start`, лише Chromium; `pnpm test:e2e`, окремий CI-job |
| supabase (CLI) | 2.122.0 | міграції, локальна БД, `gen types`, `db dump` |
| Vercel | — | деплой, `regions: ["fra1"]`, cron раз на добу; домен `saldo.maksymvasianin.com` (Cloudflare CNAME, DNS only) |
| GitHub Actions | — | нічний бекап, CI на PR без secrets: job `check` (`pnpm check` + `supabase test db`), `gitleaks` і `e2e` (оцінка 7–12 хв; локально `pnpm test:e2e` — 59 тестів за 54 с разом із `next build`, 30.10.2026) |
| gitleaks | 8.30 (MIT; лише security-патчі, drop-in заміна — betterleaks) | пошук секретів у lefthook pre-commit і CI |
| age | 1.3 (BSD-3-Clause, apt на ubuntu-latest) | шифрування бекапу на публічний ключ |
| pgTAP | 1.3.3 (у стеку Supabase) | тести RLS просторів (`supabase test db`); вхід ролями — хелпер `pg_temp.login`, без basejump/dbdev (`docs/conventions.md` §6.2) |
| pnpm | 12.14.0 (`packageManager`), Node 26.x LTS (`engines`, `.nvmrc`, CI, Vercel) | менеджер пакетів |

## Ліміти безкоштовних тарифів, що мають значення

| Сервіс | Ліміт | Наслідок для Saldo |
|---|---|---|
| Supabase Free | БД 500 МБ, egress 5 ГБ, 2 активні проєкти | вистачає на роки; фото — у Storage, не в БД |
| Supabase Free | Storage 1 ГБ, файл до 50 МБ, без image transformations | стиснення фото в браузері; запасні Vercel Blob / R2 |
| Supabase Free | пауза після 7 днів без активності | Vercel cron + нічний бекап щодня звертаються до БД |
| Supabase Free | без автоматичних бекапів і PITR | GitHub Actions dump щоночі |
| Supabase Auth | 50 000 MAU; вбудований SMTP 2 листи/год, лише адреси команди | двоє людей — 2 MAU (MCP-клієнти — ті самі MAU); листів не шлемо: запрошення — посилання, яке власник пересилає сам (ADR 20) |
| Supabase Free, двоє людей | ті самі 500 МБ / 1 ГБ / 5 ГБ egress на проєкт | дві людини ≈ подвоєння операцій і фото — усе ще роки запасу; RLS через функцію членства додає накладні витрати, некритично на цьому обсязі |
| Supabase pg_cron / pg_net | доступність на Free не перевірена; pg_net лише POST JSON | перевірка у фазі 0 |
| Vercel Hobby | cron раз на добу, точність ±59 хв, до 100 задач | часті нагадування — через pg_cron |
| Vercel Hobby | функції до 300 с, один регіон | синхронізація календаря пакетами |
| Vercel Hobby | лише особисте некомерційне використання | Saldo підходить (дві людини, некомерційно) |
| Google OAuth (unverified, In production) | екран попередження, до 100 користувачів | двоє, кожен підключає свій календар; довговічність токена перевірити |
| Web Push | без ліміту з боку браузерів | підписки на кожен пристрій кожного учасника; нагадування простору — кожному учаснику з увімкненими каналами |
| GitHub Free, публічний репо | Actions-хвилини без ліміту; артефакти й логи може завантажити будь-хто з акаунтом GitHub; secret scanning і push protection безкоштовні | бекап лише зашифрований age (ADR 23); у логах нічого з даних |
| Web Push iOS | 16.4+, лише PWA на Home Screen, дозвіл за жестом | пояснення в UI |
| iCloud CalDAV | без push, лише опитування; без пошуку за UID | детермінований UID/href, опитування кожні 15 хв |
