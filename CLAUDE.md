# Saldo

Особистий фінансовий PWA для двох і більше людей: у кожного свій простір, який можна розшарити (editor / viewer):
рахунки, операції, планові платежі, підписки, кредити, борги, бюджет, резерви, авто, податки, календар,
нагадування. Next.js 16 + Supabase (Frankfurt) + TanStack Query, деплой на Vercel (fra1),
`saldo.maksymvasianin.com`. Репозиторій публічний. Мова інтерфейсу й документації — українська, код — англійська.

## Документи
- Специфікація: `docs/spec/specification-v1.1.txt` (посилання на розділи як §N)
- Архітектура, модель даних, RPC: `docs/architecture.md`
- План із чекбоксами (відмічай виконане): `docs/plan.md`
- Правила коду й приклади: `docs/conventions.md`
- Стек і ліміти тарифів: `docs/stack.md`
- Дизайн: `docs/design/brief.md`, тема `docs/design/theme.css`, Figma-файл «Saldo»
- Дослідження: `docs/research/`

## Правила коду (коротко, повністю — conventions.md)
- `src/app` — лише маршрути; домен — `src/features/<feature>/{api,components,hooks,schemas,utils}`.
- Store — лише `src/store`, контексти — лише `src/contexts` (лише для DI).
- Імена: kebab-case + суфікс `<name>.<kind>.<ext>` (`.component.tsx`, `.hook.ts`, `.api.ts`, `.queries.ts`,
  `.mutations.ts`, `.schema.ts`, `.utils.ts`, `.server.ts`, `.test.ts` …); reserved-файли Next без суфіксів.
- Без barrel-файлів; фічі не імпортують одна одну (dependency-cruiser).
- Гроші — цілі мінорні одиниці + валюта; конвертація лише через `src/lib/money` (decimal.js).
- Кожен запис у кілька таблиць — одна RPC-функція; id генерує клієнт (`crypto.randomUUID()`), оновлення несуть `version`.
- Невідоме — `null`, ніколи не 0. План ≠ факт. Переказ і резерв ≠ витрата.
- Податки: жодних зашитих ставок чи юрисдикції.
- Тести — три рівні (conventions §6): Vitest — лише чисте ядро; pgTAP (`supabase/tests`) — RLS і RPC на чотирьох
  ролях; Playwright (`e2e/**/*.e2e.ts`) — 2–6 головних потоків фази проти локального Supabase, лише вигадані дані.

## Дизайн
Кольори, шрифти, розміри, радіуси й тіні — лише токени з `docs/design/theme.css` / змінні Figma «Saldo».
Жодних сирих значень (hex, px-розмірів шрифту, довільних `[...]` у класах Tailwind).

## Команди (додаються у фазі 0, перевірити після створення)
- `pnpm dev` · `pnpm build` · `pnpm check` (Biome + `tsc --noEmit` + depcruise + knip + vitest)
- `pnpm test` · `pnpm test:db` · `pnpm lint` · `pnpm format`
- `pnpm test:e2e` (Playwright; потрібен `supabase start`; у `pnpm check` не входить)
- `pnpm db:types` (`supabase gen types typescript`) · `supabase migration new <name>` · `supabase db push`

## Git
Коміти — Conventional Commits українською або англійською, без будь-якої атрибуції Claude / AI.
