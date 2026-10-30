# Saldo: план робіт

Порядок — §27: фундамент операцій/рахунків і плану → підписки/кредити/борги → бюджет/резерви/податки →
авто/аналітика → інтеграції й офлайн. Кожна фаза закінчується робочою задеплоєною частиною на Vercel.
Позначай `- [x]` по ходу; «Готово, коли» — перевірки з §26, які мають бути показані живцем або тестом.
Архітектура — `docs/architecture.md`, правила коду — `docs/conventions.md`.

Правила для кожної фази:
- міграція SQL у `supabase/migrations/`, `supabase db push`, потім `supabase gen types` → `src/types/database.types.ts`;
- кожна доменна таблиця: `ledger_id` + `created_by`, `unique (ledger_id, id)`, складені FK, політики
  `<table>_read` / `<table>_write` через `private.my_ledger_ids()` / `my_writable_ledger_ids()`, індекс на
  `ledger_id`, тригер `bump_version` для редагованих; pgTAP-тест RLS на owner / editor / viewer / чужого
  (`architecture.md` §5, §5.0, ADR 19);
- мутації — через `setMutationDefaults`, UUID клієнта, `scope: { id: 'writes' }` з першого дня (офлайн-сумісні);
- `pnpm check` (Biome + typecheck + depcruise + knip + vitest + `supabase test db`) зелений перед комітом і деплоєм;
- пункт «E2E» фази — 2–6 сценаріїв головних потоків (`docs/conventions.md` §6.3); `pnpm test:e2e` зелений перед
  закриттям фази й перед кожним PR, лише локально (у CI e2e і pgTAP немає з 30.10.2026: «на гіту тільки юніт»).

---

## Фаза 0. Репозиторій, інфраструктура, оболонка

**Мета:** порожній, але задеплоєний застосунок: вхід, простори з ролями й RLS під тестами, оболонка з меню §2,
PWA-маніфест, нічний бекап.

- [x] 0.1 `git init`, `.gitignore` (уже є: `.private/`, `docs/spec/`, `docs/design/screens/`, `.env*` крім `.env.example`; `graphify-out/` — у глобальному), гілка `main`, репозиторій GitHub **public** (ADR 22). Перед першим push: `git status --ignored` — особисті теки не в індексі; `gitleaks git` по всій історії чистий.
- [x] 0.1a GitHub Settings: Secret scanning + Push protection увімкнені; Actions → «Require approval for all external contributors», workflow permissions «Read repository contents»; гілка `main` захищена (лише через PR, і для власника; без force-push і видалення), `develop` — інтеграційна гілка, без force-push і видалення; з 30.10.2026 гілка за замовчуванням — `main`. Гілки: `main` ← PR з `develop` наприкінці фази; `develop` ← PR з `feat/*`. Required status checks — коли з'явиться CI (0.18a).
- [x] 0.2 `pnpm create next-app@16.4` (TypeScript, App Router, `src/`, Turbopack, без ESLint), `typescript@6.0.3`, `typedRoutes: true`.
- [x] 0.3 Tailwind 4.3: `src/app/globals.css` робить `@import "tailwindcss"; @import "../../docs/design/theme.css";` — файл теми не копіюється й не змінюється; `next-themes` (`attribute="data-theme"`).
- [x] 0.4 Шрифти Fixel Text / Fixel Display (OFL) — woff2 у `src/app/fonts/`, `next/font/local` у `src/app/layout.tsx`, змінні під `--font-sans`, `--font-display`.
- [x] 0.5 shadcn CLI 4 (варіант Base UI), `cn()` у `src/lib/utils/cn.utils.ts`; перші примітиви з Figma: Button, Input, Badge, Amount.
- [x] 0.6 Biome 2.6 (`biome.json` з `docs/conventions.md`), `pnpm lint`, `pnpm format`.
- [x] 0.7 Vitest 5 (`vitest.config.ts`, `resolve.tsconfigPaths: true`), один тест-димок.
- [x] 0.8 `dependency-cruiser@18.7.0` (`.dependency-cruiser.cjs` з `docs/conventions.md` §5.2), правило `no-cross-feature`; `knip@6.44.0` (`knip.json`, §5.2a); скрипти `pnpm deps`, `pnpm check` (§5.5); lefthook pre-commit: `biome check --staged`, `tsc --noEmit`, `depcruise src`, `gitleaks git --pre-commit --staged --redact` (gitleaks 8.30, MIT, `brew install gitleaks`; drop-in заміна — betterleaks).
- [x] 0.8a (для MCP) правило dependency-cruiser `api-is-portable`: `*.api.ts` не імпортує React, Next, TanStack і браузерний клієнт (`docs/conventions.md` §5.2).
- [x] 0.9 `@t3-oss/env-nextjs`: `src/lib/env.ts`, `.env.example` у git — лише назви змінних із коментарем, без значень (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `CRON_SECRET`, VAPID, Google).
- [x] 0.10 Supabase: прод `mlgcnbtnkrwspzvnuhmz` («Saldo») і preview `kwzskdqswlqnbsboqqbl` («Saldo Preview») — регіон перевірено: обидва Frankfurt `eu-central-1`, Postgres 17 (`supabase projects list`, 30.10.2026; перший проєкт `tqummrofnesdivujyluw` був у Стокгольмі й замінений); `supabase init`, спершу локальний стек `supabase start`, `supabase link` — фаза D; схема лише міграціями з репо (`supabase db push`), Supabase MCP — огляд, advisors, типи, без `apply_migration` у прод; перша міграція: `user_settings`, функція `bump_version()`, розширення `pg_trgm`, `pg_cron`, `pg_net`, `citext` (перевірити, що доступні на Free — записати результат у `docs/research/platform.md`).
- [x] 0.10a Міграція просторів: `ledgers`, `ledger_members` (ролі, `ledger_members_one_owner`), `ledger_invites`; схема `private` з `my_ledger_ids()`, `my_writable_ledger_ids()`, `my_owned_ledger_ids()` (security definer, `search_path = ''`, `revoke … from public`); тригер `after insert on auth.users` → власний простір + owner + `user_settings`; тригер, що не дає змінити `created_by`.
- [x] 0.10b pgTAP: `supabase test db`; вхід ролями вручну (`pg_temp.login`: `role` + `request.jwt.claims`), без basejump/dbdev — `docs/conventions.md` §6.2; тести `supabase/tests/ledgers.test.sql`: чотири користувачі (owner, editor, viewer, чужий) — хто бачить, хто пише, viewer отримує `42501`, чужий бачить 0 рядків, editor не змінює ролі, owner не видаляє себе; `supabase test db` у `pnpm check` і в CI.
- [x] 0.11 `supabase gen types typescript` → `src/types/database.types.ts`; скрипт `pnpm db:types`.
- [ ] 0.12 Auth: створити акаунт Максима (тригер дає йому простір), вимкнути «Allow new users to sign up»; перевірити MFA TOTP на Free; перевірити, що `auth.admin.createUser` працює при вимкненій реєстрації. Локально зроблено (`supabase/config.toml`: реєстрація вимкнена, TOTP увімкнено; `createUser` працює — `docs/research/platform.md`); на remote (фаза D, 30.10.2026) через `supabase config push` з тимчасового `config.toml`: прод і preview — реєстрація вимкнена (`/auth/v1/signup` → 422 `signup_disabled`), TOTP enroll/verify увімкнені, Site URL і Redirect URLs (прод — домен + `localhost:3000`; preview — `saldo-git-develop-…`, `https://*-maximwas-projects.vercel.app/**`, `localhost:3000`). Лишилось: акаунт Максима на проді (Dashboard → Add user).
- [x] 0.13 `src/lib/supabase/{browser-client,server-client}.ts`, `admin-client.server.ts`; `src/proxy.ts`; `src/lib/auth/dal.server.ts` (`verifySession` через `getClaims`); сторінка `(auth)/login`.
- [x] 0.13a (для MCP) `src/types/supabase.types.ts`: `SaldoClient = SupabaseClient<Database>`; `matcher` у `src/proxy.ts` не чіпає `/api/*` і `/.well-known/*` (там свій auth, редирект на `/login` зламав би OAuth-клієнтів); `/login` приймає `?next=` для повернення на сторінку згоди.
- [x] 0.14 Оболонка за Figma «Saldo»: Sidebar (desktop), Topbar, TabBar + FAB (mobile), «Ще»; маршрути-заглушки всіх пунктів §2 (`docs/conventions.md`, дерево); `src/constants/navigation.constants.ts`.
- [x] 0.15 Провайдери: QueryClient (без persist поки), NuqsAdapter, ClockProvider, `LedgerProvider` (`src/contexts/ledger.context.tsx`: `ledgerId`, `role` з cookie `saldo-ledger` → `user_settings.last_ledger_id` → власний простір), Toaster; `src/lib/supabase/pg-error.utils.ts` (з `42501`) + тест.
- [x] 0.16 PWA: `src/app/manifest.ts`, іконки; спайк Serwist `@serwist/turbopack` на Next 16.4 (оболонка офлайн) — результат записати.
- [x] 0.17 Vercel: проєкт, `vercel.json` `regions: ["fra1"]`, env, `CRON_SECRET`; `api/cron/daily` (поки лише `select 1` з БД — тримає проєкт активним). Зроблено 30.10.2026: проєкт `saldo` (maximwas-projects), Git — `maximwas/saldo`, production branch `main`, Node 26.x (з 30.10.2026, було 24.x), функції `fra1`; env Production → прод Supabase, Preview → preview Supabase, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET` (sensitive, згенерований без виводу); крон `0 3 * * *` → `api/cron/daily` (Bearer, `timingSafeEqual`, `head`-запит до `ledgers`). Міграції застосовані `supabase db push` спершу в preview, потім у прод (пароль не потрібен: CLI створює тимчасову login role через Management API); advisors security — 0, performance — лише INFO «unused index» на порожній БД. `SUPABASE_SECRET_KEY` для обох середовищ вносить Максим.
- [ ] 0.17a Домен `saldo.maksymvasianin.com` (ADR 24): додати у Vercel-проєкт (додано й verified 30.10.2026; Vercel радить CNAME `saldo` → `4fefc47411429e7f.vercel-dns-017.com`, чекає запису в Cloudflare); у Cloudflare CNAME `saldo` на значення з Vercel, **DNS only**; сертифікат виданий; env `NEXT_PUBLIC_SITE_URL`; Supabase Auth → Site URL і Redirect URLs (домен + `localhost:3000`, `architecture.md` §7).
- [ ] 0.18 `.github/workflows/backup.yml`: лише `schedule` + `workflow_dispatch`; dump roles/schema/data → `tar` → `age -r $AGE_RECIPIENT` (ADR 23, ключ `age-keygen` — у Максима офлайн, публічний — repo variable) → artifact 30 днів; у лог нічого з даних; ручний запуск зелений. Workflow є (secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROD_DB_PASSWORD`, variable `AGE_RECIPIENT` — вносить Максим), ручний запуск — після них.
- [ ] 0.18a `.github/workflows/ci.yml` на `pull_request` у `develop` і `main` та `push` у `develop`: без secrets, jobs `check`, `gitleaks`, `e2e`; окремо `preview-db.yml` (`supabase db push` у preview на push у `develop` з міграціями + щотижня, щоб Free не заснув); `supabase start` + `supabase test db` + `pnpm check` + gitleaks по діапазону комітів; `permissions: contents: read`.
- [x] 0.19 Спайк `PT409`: функція з `raise exception using errcode = 'PT409'` → supabase-js отримує HTTP 409 (підтверджено: `status 409`, `error.code 'PT409'`, `docs/research/platform.md`).
- [x] 0.20 Playwright (`@playwright/test@1.64.1`, `pnpm exec playwright install chromium`): `playwright.config.ts` з `docs/conventions.md` §5.6 (ключі з `supabase status -o json` — звірити назви полів; `webServer` `pnpm build && pnpm start -p 3100`; проєкти `setup`, `desktop`, `mobile`); `e2e/global-setup.ts` (`supabase db reset`, `auth.admin.createUser` для owner / editor / viewer / stranger `@example.com`, editor і viewer — у простір owner, демо-дані з `docs/design/demo-data.md`); `e2e/auth.setup.ts` → `e2e/.auth/<role>.json`; фікстура `pageAs`; `.gitignore`: `e2e/.auth/`, `playwright-report/`, `test-results/`; `supabase/config.toml` → `additional_redirect_urls` + `http://localhost:3100`; скрипти `test:e2e`, `test:e2e:ui`.
- [ ] 0.20a CI: job `e2e` у `ci.yml` (§6.3: `supabase start -x …`, кеш `~/.cache/ms-playwright`, артефакт звіту лише при падінні, 7 днів, без `.auth/`); записати фактичний час job у `docs/stack.md`.
- [x] 0.21 E2E фази 0 (`e2e/shell/`): вхід owner → Огляд; `stranger` з неправильним паролем і неіснуючий email не входять, `/` без сесії → `/login`; усі пункти меню §2 відкриваються на desktop і `@mobile` без горизонтального скролу (`scrollWidth <= clientWidth`); `/manifest.webmanifest` віддає 200 і правильну назву.
- [x] 0.22 Локалізація (ADR 25): next-intl 4.14.9 без i18n-маршрутизації, `uk` / `en`; `src/i18n/request.ts` (`user_settings.locale` → `NEXT_LOCALE` → `Accept-Language` → `uk`), `NextIntlClientProvider` у кореневому layout, типізовані ключі `src/types/next-intl.d.ts`; `messages/{uk,en}/{nav,shell,auth,errors,common,settings}.json`; оболонка, навігація, вхід, `pg-error`, заглушки — на ключах (`shell.constants.ts` видалено); дата Topbar через `useFormatter`, `Amount` форматує `minor` + `currency` (`formatMinor`); міграція `locale_codes` (`default 'uk'`, `check (locale in ('uk','en'))`); `setLocale` + перемикач «Українська / English» на `/settings`; тести `locale.utils`, повнота ключів, `money.utils`, pgTAP locale. E2E перемикання мови — агент D (0.21).
- [x] 0.23 Одне поле — один рядок (Максим, 30.10.2026): ESLint `@stylistic/object-curly-newline` (`ObjectExpression` / `TSTypeLiteral` / `TSInterfaceBody`, `minProperties: 2`, `consistent`) + `object-property-newline` + `no-restricted-syntax` (inline-тип параметра з ≥2 полями → іменований `…Props`); Biome `expand: "auto"`, Biome і ESLint покривають і конфіги (`*.{ts,mjs,cjs}`, `scripts/**`); весь репо переформатовано, повторний `pnpm format` нічого не змінює; conventions §3a.
- [x] 0.24 Серверні логи (ADR 26): pino 10.4.0 + pino-pretty 13.2.0, `src/lib/logger/logger.server.ts` (JSON у проді, pretty в dev, `LOG_LEVEL`, `redact`, `logger.child({ module })`), `src/instrumentation.ts` → `onRequestError`, `logPgError` (код + constraint без `message`), логи в `switchLedger`, `setLocale` і DAL на помилках; тест редакції `logger.utils.test.ts`; conventions §3c. Cron `/api/cron/daily`: старт, фініш із `durationMs`, збій через `logPgError` (злито з гілкою D, 30.10.2026).

Тести: `pg-error.utils.test.ts`, `env`-схема (zod); pgTAP `ledgers.test.sql` (0.10b); e2e 0.21.
- [x] 0.25 Логотип A2 «Градієнт у дугах» (Максим, 30.10.2026): Figma-компонент `Brand/Mark` 10:71281 у Mark-фреймах Sidebar і входу; `Brand` перенесено в `src/components/layout/brand.component.tsx` (inline SVG, стопи градієнта — токени `--brand-arc-*` у `globals.css`, темна тема — «A2 dark»); іконки з `public/favicon.svg` генерує `pnpm icons` (`@vite-pwa/assets-generator` 2.0.0, preset minimal-2023): `favicon.ico` 48, `favicon.svg`, `pwa-64/192/512`, `maskable-icon-512` і `apple-touch-icon-180` на суцільному `--color-primary`; `manifest.ts` і `metadata.icons`; e2e `manifest.e2e.ts` перевіряє розміри, maskable, 200 і content-type без сесії.
- [x] 0.26 Рух (Максим, 30.10.2026): токени `--duration-*` / `--ease-*` у theme.css + `MOTION`, `motion` 14.3.0; плашка SegmentedControl ковзає (`layoutId`), контент сторінки з'являється (fade + 8 px) при навігації, оболонка нерухома; `prefers-reduced-motion` — без руху (ADR 28, conventions §3a1).

Готово, коли:
- [ ] прод-URL відкривається, вхід лише для наявних акаунтів, реєстрація відмовляє;
- [x] `supabase test db` зелений: чотири ролі бачать і пишуть рівно те, що дозволено;
- [x] усі пункти меню §2 відкриваються на desktop і mobile без горизонтального скролу;
- [ ] PWA встановлюється (Chrome desktop, iOS Home Screen);
- [ ] артефакт бекапу завантажується й розшифровується `age -d` ключем Максима; лог workflow не містить даних;
- [x] push із тестовим фейковим ключем зупиняє gitleaks локально і push protection на GitHub; (30.10: gitleaks у lefthook
  зупинив коміт із фейковим `sk_live_…`; push protection увімкнений, але вигаданий `ghp_…` без валідної контрольної суми
  пропустив — GitHub ловить лише справжні формати, тому головний захист — gitleaks локально й у CI)
- [x] `https://saldo.maksymvasianin.com` відкривається з валідним сертифікатом; регіон Supabase — Frankfurt.

Питання: акаунт GitHub/Vercel для проєкту; де Максим зберігає приватний ключ age (менеджер паролів + друга копія).

---

## Фаза 1. Операції, рахунки, категорії, план і Огляд v1

**Мета:** вносити факт (дохід, витрату, переказ, повернення, коригування), бачити залишки, вносити разові планові
платежі й відмічати їх оплату; Огляд з «Доступно».

- [x] 1.1 Міграція: `accounts`, `categories` (+ сід стандартних категорій §6), `fx_rates`, `operations`, `transfers`, `attachments`, view `account_balances`.
- [x] 1.2 Міграція: `obligations`, `obligation_payments`, view `obligation_states` (часовий пояс із `ledgers.time_zone`).
- [x] 1.3 RPC: `create_operation`, `update_operation`, `delete_operation`, `create_transfer`, `pay_obligation`, `delete_obligation_payment`, `archive_category`.
- [x] 1.4 `src/lib/money/money.utils.ts` (toMinor, fromMinor, format з «−» і ₴ $ €), `fx.utils.ts` (convert з decimal.js і режимом округлення).
- [x] 1.5 Фіча `accounts`: список, створення (початковий залишок + дата), архів, картка рахунку.
- [x] 1.6 Фіча `categories`: дерево доходів/витрат, підкатегорії, колір (`--color-c-*`), порядок, архів із перенесенням.
- [x] 1.7 Фіча `currencies`: базова валюта, ручний курс із датою; знімок курсу в операції; `null` при невідомому.
- [ ] 1.8 Фіча `operations`: форма (MoneyInput, рахунок, категорія, дата, контрагент, коментар), список (таблиця desktop / картки по днях mobile), фільтри в URL, дублювати, видалити, перехід до джерела.
- [ ] 1.9 Переказ між рахунками з різними валютами й окремою комісією.
- [ ] 1.10 Вкладення чека: стиснення, приватний бакет `attachments`, політика Storage, signed URL. Видалення операції чи простору має видаляти й об'єкти Storage (рядки `attachments` ідуть каскадом, файли — ні).
- [x] 1.11 Фіча `obligations`: ручний плановий платіж, «Найближчі» з групами §7, діалог «Оплачено» (`?pay=`), прив'язка наявної операції.
- [ ] 1.12 `src/lib/finance/available-money.utils.ts` (без резервів поки) + Огляд: залишки, місяць (дохід/витрата/результат), найближчі, «Доступно до дати» з розкриттям складових.
  - [x] чиста частина: `computeAvailableMoney` (складові, невідома сума / курс → `null`, очікуваний дохід не додається)
  - [x] Огляд, читання (30.10.2026): `/` — hero «Доступно до <дата>» зі складовими (без резервів), «Найближчі», «Рахунки», порожні стани; дата доходу — `ledgers.next_income_on` (null → «Доступно» не рахується); 
  - [x] блок «місяць» (дохід / витрата − повернення / результат, базова валюта; переказ, борг, коригування не рахуються) і «Змінити» дату доходу (`ledgers.next_income_on`, лише owner; очікуваного доходу в схемі немає)
- [x] 1.13 `src/store/ui.store.ts`: приховати суми; Налаштування: тема, мова (особисті, `user_settings`); часовий пояс, початок тижня, дата наступного доходу — налаштування простору (`ledgers`; RLS дозволяє зміну лише owner, тож форма лише для нього).
- [ ] 1.14 Глобальний «Додати» (дохід / витрата / переказ) через `?add=`.
- [x] 1.15 (для MCP) Кожна дія запису має input-схему `<action>-input.schema.ts` (мінорні одиниці, `id: z.uuid()`, без `transform`), а форма — чисту `to<Action>Input(values, clock)`; функції `*.api.ts` отримують `db: SaldoClient` першим параметром і роблять `parse` перед `rpc()`.
- [x] 1.16 (для MCP) Огляд і «Доступно» читаються функціями `*.api.ts` + `available-money.utils.ts` з `now`/`timeZone` параметрами; хук лише склеює. Тест: та сама функція без React дає ті самі складові.
  - [x] чиста частина: `available-money.utils.ts` бере `now`/`timeZone` параметрами (`src/lib/utils/clock.utils.ts`)
  - [x] `getOverview(supabase, { ledgerId, now, timeZone })` у `src/features/overview/api/overview.api.ts` + тест без React; хук `useOverview` лише обгортає `overviewQueries.detail`
- [x] 1.17a RPC: `create_ledger`, `create_ledger_invite`, `accept_ledger_invite` (security definer, email з JWT), `set_member_role`, `remove_member`; pgTAP: прострочене / чуже / повторне запрошення, editor не запрошує (`supabase/tests/ledger-rpc.test.sql`).
- [x] 1.17b Фіча `ledgers` у UI (хвиля B).
- [x] 1.18 Налаштування → «Доступ»: учасники з роллю, «Запросити» (email, роль; токен у браузері, у БД — SHA-256; «Копіювати посилання»), зміна ролі, «Відкликати», «Вийти з простору»; налаштування простору (назва, базова валюта, часовий пояс).
- [x] 1.19 Прийняття запрошення: `(auth)/invite/[token]`, `api/invites/accept` (`auth.admin.createUser` лише за дійсним токеном), вхід з `?next=`, після прийняття — перемикання на простір.
- [x] 1.20 Перемикач простору в Sidebar і mobile Topbar; ключі запитів `[root, ledgerId, …]`; кожна мутація несе `ledger_id`; viewer не бачить кнопок запису.
- [ ] 1.21 Автор і підтвердження: аватар-ініціал `created_by` у рядках операцій і платежів, «Підтвердив(ла) … · дата» в оплаченому зобов'язанні, фільтр «Хто» в операціях (URL), `pay_obligation` з `p_expected_version` і `PT409`, коли оплату вже позначила інша людина.
- [x] 1.22 pgTAP RLS для кожної таблиці фази 1 (owner / editor / viewer / чужий) і складених FK (операція не посилається на рахунок іншого простору).
- [ ] 1.23 E2E операцій (`e2e/operations/`): витрата змінює залишок рахунку й «Доступно» на Огляді рівно один раз, подвійний клік «Зберегти» — один рядок, а переказ між рахунками в тому самому тесті не додає витрат місяця; «Оплачено» на плановому платежі створює одну операцію, видалення оплати повертає план у «Найближчі».
- [ ] 1.24 E2E шарингу (`e2e/sharing/`, фікстура `pageAs`): owner створює запрошення, нова людина відкриває посилання, стає editor і бачить ту саму цифру «Доступно»; editor вносить витрату — owner бачить її з ініціалом автора; viewer не бачить «Додати», а `?add=expense` не зберігає (`42501` → повідомлення); після «Відкликати» простір зникає з перемикача editor після перезавантаження.

Тести: `money.utils`, `fx.utils` (округлення, крос-курс), `available-money.utils` (невідома сума, невідомий курс,
очікуваний дохід не додається), схеми форм операції й переказу, `pg-error.utils` для нових обмежень, схема
запрошення; pgTAP 1.17, 1.22.

Готово, коли (§26):
- [ ] операція враховується один раз у залишку, Огляді й «Найближчих»;
- [ ] переказ не збільшує витрати; повернення не є доходом; коригування вимагає примітки;
- [ ] «Оплачено» створює одну операцію; прив'язка наявної — нуль нових операцій; видалення оплати повертає план;
- [ ] план не стає фактом через минулу дату — показано «дата минула без підтвердження»;
- [ ] редагування операції узгоджує залишок і стан зобов'язання;
- [ ] новий ручний курс не змінює суми в базовій валюті старих операцій;
- [ ] подвійне натискання «Зберегти» / повтор запиту дає один запис;
- [ ] друга людина за посиланням стає editor, бачить ті самі рахунки й ту саму цифру «Доступно»; viewer не може
  внести операцію; після «Відкликати» наступний запит не повертає даних простору;
- [ ] дві людини позначають одну оплату — одна оплата, друга отримує конфлікт із «Підтвердив(ла) …».

Питання: базова валюта (UAH чи EUR); стартові залишки рахунків; валюта основної картки.

---

## Фаза 2. Підписки, кредити, борги, календар

**Мета:** серії планових платежів із правилами повторення, графіки кредитів, особисті борги, головний календар.

- [ ] 2.1 `src/lib/recurrence/recurrence.utils.ts`: `generateOccurrences({ unit, count, firstOn, shortMonthRule, from, until })`, плюс робота з `@date-fns/tz`.
- [ ] 2.2 Міграція: `subscriptions`, `subscription_prices`, `credits`, `debts`, `debt_movements`, `calendar_saved_filters`; RPC `upsert_series_obligations`, `set_subscription_price`, `save_credit`, `replace_credit_schedule`, `save_debt`, `add_debt_movement`.
- [ ] 2.3 Фіча `subscriptions`: список з фільтрами станів, два підсумки (план місяця / нормалізована середньомісячна), картка (Огляд / Історія / Налаштування), ціна з датою чинності, стани скасування, оцінка, стандартні налаштування без перезапису наявних.
- [ ] 2.4 Фіча `credits`: три способи введення (повний графік, рівні внески, наявний кредит за наступною датою й залишком), `features/credits/utils/installments.utils.ts`, точність графіка, дострокове погашення з підтвердженням (`replace_credit_schedule`).
- [ ] 2.5 Фіча `debts`: два напрями, новий рух / старий борг без руху / частка покупки, часткові повернення, строк → зобов'язання.
- [ ] 2.6 `api/cron/daily`: розширення горизонту зобов'язань до +13 міс. для активних серій.
- [ ] 2.7 Seed лише з `docs/design/demo-data.md` (вигадані підписки й кредити); реальні дані Максим вносить сам через UI. Підтримка `paid_before_tracking_count` (сплачені до обліку, без фіктивних минулих операцій) і позначки «графік розрахунковий» лишається можливістю застосунку.
- [ ] 2.8 RPC `calendar_entries` + фіча `calendar`: місяць / тиждень / день / список, денні суми факту й плану, фільтри та швидкі набори §18, збереження набору, клік по дню й запису, оплата / зміна дати / перехід до джерела.
- [ ] 2.9 «Найближчі» об'єднують усі джерела; Огляд — непогашені борги окремо від мінуса місяця й нестачі.
- [ ] 2.10 (для MCP) «Найближчі» й календар — функції `*.api.ts` з параметрами діапазону (не з URL-стану), щоб MCP викликав ті самі запити.
- [ ] 2.11 E2E: нова щомісячна підписка з’являється в «Найближчих» і в календарі на свою дату; кредит рівними внесками — графік із N внесків, «Оплачено» на першому зменшує залишок, а повна вартість не потрапляє у витрати; частковий рух боргу змінює залишок боргу, не дохід; фільтр календаря в URL переживає перезавантаження й змінює денні суми.

Тести: `recurrence.utils` (31-ше → лютий у високосний і звичайний рік для трьох правил; кожні N днів через зміну
часу DST у Europe/Kyiv; річний інтервал 29 лютого; `until` включно), `installments.utils` (рівні внески з
залишком округлення в останньому; сума внесків = загальна сума), ціна з датою чинності змінює лише майбутні,
нормалізована вартість річної підписки, правило власної частки боргу, схеми форм.

Готово, коли (§26):
- [ ] короткі місяці й часові пояси покриті тестами й видно в календарі;
- [ ] зміна ціни не переписує історичні оплати й минулі зобов'язання;
- [ ] повна вартість покупки в кредит не додається до витрат разом із внесками;
- [ ] позика не потрапляє в дохід/витрати, баланс змінюється;
- [ ] календарні фільтри змінюють підсумки; оплачений план + факт показані одним записом;
- [ ] для кредитів із `paid_before_tracking_count` немає фіктивних минулих операцій.

Питання: правило короткого місяця для підписок 29–31-го; останні внески й правила перенесення кредитів.

---

## Фаза 3. Нагадування й сповіщення

**Мета:** серверні нагадування незалежно від відкритої вкладки, Web Push, центр сповіщень.

- [ ] 3.1 Міграція: `reminder_rules`, `notifications`, `push_subscriptions`; функція `due_reminder_fires(p_now)` лише для service_role.
- [ ] 3.2 VAPID-ключі (env), subject `https://saldo.maksymvasianin.com`, `src/features/notifications/api/web-push.server.ts` на `@pushforge/builder`.
- [ ] 3.3 `api/cron/reminders`: секрет, вибірка, `insert … on conflict do nothing returning`, push, 404/410 → видалення підписки.
- [ ] 3.4 pg_cron: `cron.schedule('reminders', '*/10 * * * *', …net.http_post…)` з секретом із Vault.
- [ ] 3.5 Service worker: обробник `push` (завжди `showNotification`), `notificationclick` → `link_path`.
- [ ] 3.6 UI: дозвіл на push за жестом, центр сповіщень (нові / прочитані, дія, стан доставки), правила на підписці/кредиті/боргу, стандарти §25 (підписки за 3 і 2 дні, кредити — лише в день оплати).
- [ ] 3.7 Пояснення в UI: на iOS push лише з Home Screen.
- [ ] 3.8 Учасники: `due_reminder_fires` повертає рядок на кожного учасника простору за `ledger_members.notify_channels`; `notifications` і прочитане — в кожного свої; налаштування «Нагадування цього простору мені» в «Доступ»; pgTAP: viewer із вимкненими каналами не отримує.
- [ ] 3.9 E2E (`e2e/notifications/`): виклик `/api/cron/reminders` з `CRON_SECRET` двічі — у центрі сповіщень одне сповіщення, «Прочитано» переносить його в прочитані; `grantPermissions(['notifications'])` + «Увімкнути» → рядок у `push_subscriptions`, відмова в дозволі → пояснення; після «Оплачено» наступний виклик крону нового сповіщення не дає. Доставка push (iOS Home Screen, закрита вкладка) — лише вручну.

Тести: обчислення моменту спрацювання (offset, `at_time`, часовий пояс, DST), побудова `fire_key`.

Готово, коли:
- [ ] повторний виклик крону не створює другої notification і другого push;
- [ ] після оплати нагадування за цим зобов'язанням припиняються (§24);
- [ ] push приходить на встановлену PWA iOS і в desktop Chrome при закритій вкладці.

Питання: канали нагадувань (§27), чи потрібен календарний сигнал додатково.

---

## Фаза 4. Резерви, великі витрати, бюджет

**Мета:** конверти й цілі, великі витрати з накопиченням, бюджет місяця; «Доступно» з резервами.

- [ ] 4.1 Міграція: `reserves`, `reserve_accounts`, `reserve_movements`, views `reserve_balances`, `account_free_balances`; RPC `move_reserve`; `pay_obligation` з `p_reserve_id` (і `reserveId` у `payObligationInputSchema`, прибраний у фазі 1, поки RPC його не знав).
- [ ] 4.2 Фіча `reserves`: конверт / ціль / ціль зі строком, зарезервувати, звільнити, перемістити, оплатити з резерву, завершити, дефіцит забезпечення.
- [ ] 4.3 Фіча `big-expenses`: оцінка, дата, конверт, накопичено / потрібно ще, план резервування, стани.
- [ ] 4.4 Зв'язок конверта з підпискою / зобов'язанням без дубля зобов'язання (`obligations.envelope_id`).
- [ ] 4.5 `available-money.utils.ts`: резерви + розподіл покриття (`reserve-allocation.utils.ts`); Огляд: резерви й цілі.
- [ ] 4.6 Міграція `budget_months`, `budget_limits`; функція `budget_month_facts`; RPC `copy_budget_month`.
- [ ] 4.7 Фіча `budget`: план доходів, ліміти, факт, залишок / перевищення, порогові попередження, копіювання, перенесення або скидання залишку, перехід до операцій.
- [ ] 4.8 E2E (окремий простір на тест): «Зарезервувати» зменшує «Доступно», а витрати місяця й баланс рахунку не змінює; оплата з резерву зменшує резерв і баланс один раз; спроба зарезервувати більше вільного — відмова з поясненням; ліміт категорії й витрата понад нього — «перевищення» в Бюджеті.

Тести: `reserve-allocation.utils` (один конверт на кілька зобов'язань за порядком строків; покрите не віднімається
двічі), `available-money.utils` з резервами, перенесення залишку ліміту, баланс резерву не від'ємний.

Готово, коли (§26):
- [ ] резерв не збільшує витрати й не змінює баланс рахунку;
- [ ] витрата з резерву зменшує резерв і баланс один раз;
- [ ] одні гроші не резервуються двічі (відмова з поясненням);
- [ ] «Доступно» показує складові й збігається з ручним розрахунком на прикладі.

---

## Фаза 5. Податки

**Передумова:** відповіді на питання §27 (нижче). Без них — лише профіль із ручними сумами.

**Мета:** налаштовуваний облік податкових зобов'язань без зашитої юрисдикції.

- [ ] 5.1 Міграція: `tax_profiles`, `tax_types`, `tax_rule_versions` (insert-only), `income_tax_details`, `tax_withholdings`, `tax_liabilities`, `tax_liability_base_items`, `tax_adjustments`, view `tax_liability_states`.
- [ ] 5.2 Тригер `operations_mark_tax_review` (after update / delete) → `needs_review`.
- [ ] 5.3 RPC: `save_tax_liability_draft`, `confirm_tax_liability`, `adjust_tax_liability`, `link_withholding`; `create_operation` з `p_tax`, `p_withholdings`.
- [ ] 5.4 `features/taxes/utils/tax-calculation.utils.ts`: база з фільтра, курс за `fx_method`, округлення, результат зі складовими й `baseComplete`.
- [ ] 5.5 Дохід: gross / утримання / net, профіль, класифікація (не з назви категорії).
- [ ] 5.6 Розділ Податки: Огляд (оцінено / підтверджено / сплачено / утримано / залишок / найближчий строк / резерв), Зобов'язання (картка з базою й версією), Історія оплат (перехід до операцій), Налаштування (профілі, типи, версії правил).
- [ ] 5.7 Резерв частки надходження за `reserve_share` — пропозиція після внесення доходу, не автоматична сплата.
- [ ] 5.8 Нагадування типу «строк звітності» без витрати; тип «Податки» в календарі й «Найближчих».
- [ ] 5.9 Офлайн-оцінка з `base_complete = false` позначена «потребує серверної перевірки», підтвердження заблоковане.
- [ ] 5.10 `tax_profiles.taxpayer_user_id` — «чий податок» у профілі; підказка, що податки бачать усі учасники простору.
- [ ] 5.11 E2E (правило й ставку вводить тест, вигадані): профіль + тип + версія правила → дохід → чернетка зобов'язання зі складовими бази; підтвердження й часткова оплата з рахунку — залишок і «сплачено» окремо; редагування джерельного доходу → «потребує перегляду», оплати не змінені; без профілю — жодної автоматичної суми.

Тести: `tax-calculation.utils` (відсоток від бази з виключеннями; зміна версії правила за датою; округлення трьома
режимами; невідомий курс → неповна база; перекази й `debt_in` не в базі), різниця при `needs_review`, переплата
окремо, утримання не збільшує сплачене з рахунків.

Готово, коли (§26):
- [ ] невідомий режим не породжує автоматичних сум;
- [ ] база має джерела, розрахунок відтворюється з версії правила й курсу;
- [ ] зміна джерельного доходу викликає «потребує перегляду» без зміни оплат;
- [ ] утримане не списується повторно; резерв не є сплатою;
- [ ] часткова оплата й переплата показані окремо.

Питання (§27): країна й податкове резидентство/режим; gross чи net у доході; перелік податків/внесків; база й
валюта; ставки та дати чинності; строки оплати/звітів; правила утримання; початкові заборгованості/переплати.

---

## Фаза 6. Автомобіль

**Мета:** авто, заправки, сервіси, план робіт — кожна подія = одна операція.

- [ ] 6.1 Міграція: `vehicles`, `fuelings`, `services`, `service_items`, `maintenance_plans`; RPC `save_fueling`, `save_service`.
- [ ] 6.2 Фіча `auto`: Огляд (майбутні роботи, витрати), Заправки, Ремонт і обслуговування (кілька робіт), План робіт (дата і/або пробіг, «що раніше», резерв, нагадування).
- [ ] 6.3 `fuel-consumption.utils.ts` з причиною, коли розрахунок неможливий.
- [ ] 6.4 План з датою → зобов'язання `auto_plan`; виконання плану → сервіс + операція.
- [ ] 6.5 E2E: заправка видна в Авто, Операціях і календарі одним записом, витрата пального показана або з причиною «неможливо розрахувати»; сервіс із двома роботами — одна операція; план робіт із датою з'являється в «Найближчих», виконання створює сервіс і операцію.

Тести: `fuel-consumption.utils` (повний бак → повний бак; пропущений запис; часткова заправка між).

Готово, коли (§24, §26):
- [ ] одна заправка видна в авто, операціях, календарі й статистиці без дублів;
- [ ] заплановані шини резервуються без витрати, покупка створює факт;
- [ ] пробіг не вигадується.

---

## Фаза 7. Статистика й експорт

**Мета:** звіти §20 з табличним еквівалентом, експорт і перевірене відновлення.

- [ ] 7.1 Функції `stats_*`; фіча `statistics`: доходи / витрати / результат, категорії, бюджет план/факт, підписки факт/план/середня, кредитне навантаження й завершення, авто, цілі/резерви, податки.
- [ ] 7.2 Кожна діаграма (recharts) має таблицю й перехід до складових; невідомий курс і порожні дані позначені.
- [ ] 7.3 Прогноз — лише за внесеними графіками зобов'язань.
- [ ] 7.4 Фіча `data-export`: CSV операцій, повний JSON + вкладення (zip), видалення всіх даних з підтвердженням.
- [ ] 7.5 Глобальний пошук ⌘K (`search_entities`, cmdk).
- [ ] 7.6 Навчання з відновлення бекапу в новий проєкт (`age -d` ключем Максима), результат у `docs/restore-drill.md`.
- [ ] 7.7 Учасники: статистика й експорт — у межах активного простору; фільтр «Хто» (`created_by`) у статистиці; експорт робить будь-який учасник, видалення простору — лише owner.
- [ ] 7.8 E2E: статистика місяця з переказом і позикою — вони не в доходах/витратах, таблиця під діаграмою збігається з підсумком; CSV-експорт (`page.waitForEvent('download')`) містить створену тестом операцію з міткою `e2e-…`; ⌘K знаходить операцію за коментарем; viewer не бачить «Видалити всі дані».

Тести: класифікація операцій для звітів (переказ, позика, резерв, повернення, частка боргу), нормалізація підписок.

Готово, коли (§26):
- [ ] кожен показник пояснюваний; позика не змішана з заробітком, план із фактом, покупка з внесками;
- [ ] експорт відкривається, відновлення з бекапу дає ті самі залишки.

---

## Фаза 8. Офлайн і синхронізація пристроїв

**Мета:** повний офлайн-режим §22 поверх уже офлайн-сумісних мутацій.

- [ ] 8.1 `PersistQueryClientProvider` + idb-keyval, `buster` = версія схеми, `gcTime >= maxAge`.
- [ ] 8.2 Реєстрація `setMutationDefaults` усіх фіч до гідрації, `resumePausedMutations` після; спайк `networkMode: 'offlineFirst'` після reload.
- [ ] 8.3 Serwist: прекеш оболонки, офлайн-сторінка, без кешування `/rest/` і `/storage/`.
- [ ] 8.4 Стани записів draft / pending / synced / error / conflict у списках і `SyncStatus`; екран черги з діями.
- [ ] 8.5 Чернетки форм у `drafts.store.ts`; офлайн-фото чека в IndexedDB до завантаження.
- [ ] 8.6 Конфлікт `PT409`: показ обох версій, вибір, без мовчазного перезапису.
- [ ] 8.7 Вихід очищає IndexedDB і кеші.
- [ ] 8.8 Дві людини офлайн: кеш розділений за `ledgerId`; `42501` у черзі (доступ відкликали) → стан error з діями; живий тест: два телефони офлайн оплачують один платіж → одна оплата, один конфлікт.
- [ ] 8.9 E2E (`e2e/offline/`, Chromium, прод-збірка): `setOffline(true)` → витрата → `SyncStatus` «Очікує (1)» → `reload()` офлайн відкриває оболонку з кешем і чергою → `setOffline(false)` → «Синхронізовано», owner бачить один рядок; конфлікт `PT409`: owner онлайн і editor офлайн оплачують один платіж → одна оплата, у editor стан «Конфлікт» із «Підтвердив(ла) …»; вихід очищає IndexedDB (`indexedDB.databases()` порожній); відкликаний editor із чергою отримує стан error. Спершу перевірити, що `setOffline` у Chromium блокує й запити service worker (microsoft/playwright#2311).

Тести: допоміжні функції черги (стан запису з мутації, злиття оптимістичного рядка з серверним за `id`).

Готово, коли (§26):
- [ ] офлайн-витрата після перезавантаження пристрою синхронізується одним записом;
- [ ] повторна відправка не дає дублів; конфлікт не затирається;
- [ ] показано останнє оновлення й кількість очікуваних змін.

---

## Фаза 9. Календарні інтеграції Google та iCloud

**Мета:** двостороння серверна синхронізація прив'язаних подій і міграція наявних серій §25.

- [ ] 9.1 Google Cloud: OAuth-клієнт (origin `https://saldo.maksymvasianin.com`, redirect `…/api/integrations/google/callback`, домен в authorized domains), scopes, публікація «In production» без верифікації; живий тест довговічності refresh token (тиждень).
- [ ] 9.2 Міграція: `calendar_connections`, `calendar_links`, `sync_jobs`, тригер на `obligations`, `store_integration_secret`, `claim_sync_jobs`.
- [ ] 9.3 Маршрути `api/integrations/google/{start,callback,webhook}`, `api/cron/calendar-sync`; `@googleapis/calendar`.
- [ ] 9.4 Push: подія на зобов'язання, all-day для подій лише з датою, `extendedProperties.private`.
- [ ] 9.5 Pull: `events.watch` + `syncToken`, 410 → повний ресинк, поновлення каналу в `api/cron/daily`; вхідні зміни → `pending_external_change` → UI прийняти / відхилити.
- [ ] 9.6 Відкликання доступу → `revoked`, «перепідключити», історія лишається.
- [ ] 9.7 Майстер міграції наявних серій підписок і кредитів: зіставлення, підтвердження, жодних копій.
- [ ] 9.8 iCloud: tsdav, app-specific password у Vault, детермінований UID/href, опитування; попередження про дубль Google-у-Apple.
- [ ] 9.9 Налаштування: акаунт, календар, типи, напрям, сповіщення, остання успішна синхронізація.
- [ ] 9.10 Учасники: підключення — особисте (`user_id` + `ledger_id`), тригер `obligations` ставить задачу на кожне підключення учасників з `calendar_sync`; вхідна зміна з календаря одного учасника видна всім editor/owner; Google OAuth-клієнт — обидві адреси в тестовому доступі або «In production».
- [ ] 9.11 E2E без реальних Google та iCloud: «Підключити Google» веде на `accounts.google.com/o/oauth2` з потрібними scopes і `redirect_uri` (`page.route` перехоплює, далі не йде); вхідна зміна (`pending_external_change`, вставлена admin-клієнтом) — «Прийняти» переносить дату зобов'язання, «Відхилити» лишає, факт не змінюється; «Відключити» підключення (вставленого admin-клієнтом) — стан і історія зв'язків лишаються. Сама синхронізація — вручну за «Готово, коли».

Тести: побудова тіла події з зобов'язання, хеш для `last_pushed_hash`, оцінка відповідності серії (дата, період,
сума), розбір вхідної зміни (перенесення, видалення, чужа подія → пропуск).

Готово, коли (§26):
- [ ] повторна синхронізація не дає дублів подій;
- [ ] видалення події в календарі не видаляє факт і не скасовує зобов'язання;
- [ ] перенесення в календарі не змінює юридичний строк податку без підтвердження;
- [ ] неприв'язані події не змінені; відключення не видаляє історію;
- [ ] 17 наявних серій прийняті без копій.

Питання: лишати прийняті серії чи замінювати подіями застосунку; приймати перенесення підписок автоматично чи питати.

---

## Фаза 10. MCP

**Мета:** Claude Code і Perplexity читають дані Saldo через один remote MCP-сервер з OAuth від імені власника під
RLS; запис — лише з підтвердженням (`docs/architecture.md` §12, `docs/research/mcp.md`).

- [ ] 10.1 Supabase: увімкнути OAuth 2.1 Server і Dynamic Client Registration, шлях авторизації → `https://saldo.maksymvasianin.com/oauth/consent`; записати, чи є CIMD (`/.well-known/oauth-authorization-server/auth/v1`).
- [ ] 10.2 `mcp-handler@2.3.0`, `@modelcontextprotocol/server@2.4.0`; `src/app/api/mcp/route.ts` (`withMcpAuth`, `required: true`), `src/lib/supabase/token-client.server.ts`, `verifySupabaseToken` (`getClaims`, є `client_id`).
- [ ] 10.3 `/.well-known/oauth-protected-resource` (`protectedResourceHandler`) і `/.well-known/oauth-authorization-server` (копія метаданих Supabase з кешем) + `OPTIONS` для CORS.
- [ ] 10.4 Сторінка `(auth)/oauth/consent`: клієнт, scope, «Дозволити» / «Відмовити»; список виданих доступів і відкликання в Налаштування → Безпека.
- [ ] 10.5 Міграція `mcp_audit_log` (RLS) + restrictive-політики для OAuth-клієнтів (`auth.jwt() ->> 'client_id' is not null` → без `delete`).
- [ ] 10.6 Read-tools у `src/mcp/tools/*.tools.server.ts`: баланси, «Доступно до дати», найближчі, пошук операцій, підписки, кредити, бюджет місяця, календар, пошук; resources `saldo://accounts`, `saldo://categories`, `saldo://settings`.
- [ ] 10.7 Перевірка клієнтів живцем: MCP Inspector (`npx @modelcontextprotocol/inspector`), Claude Code (`claude mcp add --transport http saldo https://saldo.maksymvasianin.com/api/mcp`, `/mcp`), Perplexity (Plugins → Add MCP connector → Remote, OAuth).
- [ ] 10.8 Write-tools за `MCP_WRITE_ENABLED`: `add_operation`, `mark_paid`, `create_planned_payment` — ті самі input-схеми й `*.api.ts`, що й UI; без `confirm: true` лише попередній перегляд.
- [ ] 10.9 `import_statement_preview` поверх модуля імпорту виписок (після того, як модуль з'явиться в плані).
- [ ] 10.10 Вільний текст із даних — у полях `untrusted_text`; ліміт рядків і розміру відповіді.
- [ ] 10.11 Учасники: tool `list_ledgers`, необов'язковий `ledger_id` у tools (за замовчуванням `last_ledger_id`), `mcp_audit_log` з `user_id` і `ledger_id`; перевірка: токен viewer не пише.
- [ ] 10.12 E2E (Playwright `request`, без браузера, крім згоди): `/api/mcp` без токена → 401 з `resource_metadata`; сторінка `/oauth/consent` — «Дозволити» видає доступ, він є в Налаштування → Безпека, «Відкликати» прибирає; `tools/call` «Доступно до дати» з токеном owner дає те саме число, що Огляд; write-tool із токеном viewer відмовляє. Claude Code і Perplexity — вручну (10.7).

Тести: `verifySupabaseToken` (без `client_id`, прострочений, чужий `sub`), побудова попереднього перегляду write-tool,
обгортка `untrusted_text`, мапінг `PT409` і помилок обмежень у результат tool.

Готово, коли:
- [ ] без токена `/api/mcp` повертає 401 з `resource_metadata`; Claude Code і Perplexity проходять OAuth і бачать tools;
- [ ] «Доступно до дати» через MCP дорівнює числу на Огляді, складові ті самі;
- [ ] `add_operation` двічі з тим самим `id` дає один запис; без `confirm` нічого не записано;
- [ ] MCP-клієнт не може видалити операцію (restrictive-політика), а UI може;
- [ ] кожен виклик є в `mcp_audit_log`; відкликання доступу в Налаштуваннях зупиняє клієнта.

Питання: чи вмикати запис з першого дня; чи потрібен імпорт виписок через MCP, чи лише в UI.
