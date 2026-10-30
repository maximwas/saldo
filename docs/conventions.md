# Saldo: правила коду

Основа — правило Максима `nextjs-project-architecture` (маршрути лише в `app/`, домен у `features/`, store лише в
`src/store`, контексти лише в `src/contexts`, без barrel, фічі не імпортують одна одну). Два свідомі відхилення:
1. `features/<f>/api/*.api.ts` — виклики supabase-js під RLS, а не server-only функції: з браузера (офлайн-черга)
   і, у фазі 10, з MCP-сервера з JWT власника. Клієнт приходить параметром (§4.3); серверний код має суфікс
   `.server.ts` і `import 'server-only'`.
2. Імена — суфікси в стилі NestJS (`subscriptions.store.ts`, а не `subscriptions-store.ts`).

Конфіги нижче — ескізи, **конфіг не запускався**; перевіряються у фазі 0.

## 0. Простори й RLS — з першого рядка (ADR 19, `docs/architecture.md` §5, §5.0)

- **`ledger_id` на кожній доменній таблиці** (усе, що належить простору): `uuid not null references ledgers on
  delete cascade`, без default — клієнт передає явно; `unique (ledger_id, id)`; посилання між таблицями простору —
  складені FK `(ledger_id, <ref>_id)`; індекс, що починається з `ledger_id`; `created_by default auth.uid()`.
  Особисті таблиці (`user_settings`, `push_subscriptions`, `notifications`, `calendar_connections`) — `user_id`.
- **Політики лише через функції членства**: `ledger_id in (select private.my_ledger_ids())` на читання,
  `private.my_writable_ledger_ids()` на запис, `private.my_owned_ledger_ids()` на керування учасниками. Жодних
  підзапитів до `ledger_members` у тілі політики, жодного `auth.uid() = user_id` на доменних таблицях, завжди
  `to authenticated` і `(select …)` навколо функцій. Нова функція `security definer` — лише в схемі `private`, з
  `set search_path = ''` і `revoke execute … from public`.
- **RPC** — `security invoker` (RLS діє); `security definer` лише там, де треба читати чуже (прийняття
  запрошення), і з явною перевіркою `auth.uid()` усередині.
- **Тести RLS на двох людях**: кожна міграція з новою таблицею має pgTAP у `supabase/tests/<table>.test.sql`:
  owner і editor пишуть, viewer читає й отримує `42501` на запис, чужий бачить 0 рядків і не вставляє рядок у чужий
  `ledger_id`; складений FK не дає послатися на рядок іншого простору. `supabase test db` — у `pnpm check` і CI.
- **Клієнт**: ключі запитів `[root, ledgerId, …]` (§4.1), кожен запит має явний `.eq('ledger_id', ledgerId)`,
  кожна мутація несе `ledger_id`; `ledgerId` і `role` — лише з `useLedger()` (`src/contexts/ledger.context.tsx`).
- **Публічний репозиторій** (ADR 22): у git — лише вигадані дані (сід, фікстури, приклади в доках); суми й назви з
  §25 і з `.private/` не копіюються в код, тести чи коміти.

## 1. Дерево

```
saldo/
  CLAUDE.md
  biome.json  .dependency-cruiser.cjs  knip.json  lefthook.yml  vitest.config.ts  playwright.config.ts  vercel.json
  next.config.ts  tsconfig.json  package.json  .env.example
  .github/workflows/backup.yml  .github/workflows/ci.yml   (ci.yml: jobs check і e2e)
  docs/                                  spec, research, design, architecture, plan, stack, conventions
  e2e/                                   Playwright (§6.3); не імпортується з src/
    global-setup.ts                      supabase db reset, 4 користувачі через admin API, вигадані демо-дані
    auth.setup.ts                        вхід через /login кожною роллю → .auth/<role>.json
    .auth/                               storageState (у .gitignore)
    fixtures/roles.fixture.ts            pageAs(role): окремий контекст на роль
    fixtures/users.fixture.ts            E2E_USERS: owner / editor / viewer / stranger @example.com
    fixtures/demo-data.fixture.ts        набір із docs/design/demo-data.md
    <feature>/<flow>.e2e.ts              shell/, operations/, sharing/, offline/ …
  public/icons/                          іконки PWA
  supabase/
    config.toml
    migrations/<timestamp>_<name>.sql
    tests/<table>.test.sql               pgTAP: RLS owner / editor / viewer / чужий (§0)
    seed.sql                             лише локально: стандартні категорії, вигадані демо-дані (не з §25: репо публічне)
  src/
    proxy.ts                             оновлення сесії, оптимістичний редирект на /login
    app/
      layout.tsx                         <html data-theme>, шрифти, globals.css
      globals.css                        @import "tailwindcss"; @import "../../docs/design/theme.css";
      manifest.ts
      fonts/                             Fixel Text / Fixel Display woff2 для next/font/local
      not-found.tsx
      serwist/[path]/route.ts
      (auth)/login/page.tsx
      (auth)/invite/[token]/page.tsx     прийняття запрошення в простір
      (app)/
        layout.tsx                       оболонка: Sidebar / Topbar / TabBar / FAB, шторки ?pay= ?add= ?entry=
        page.tsx                         Огляд
        operations/page.tsx              Операції → Усі операції
        operations/accounts/page.tsx     Операції → Рахунки
        operations/accounts/[accountId]/page.tsx
        operations/categories/page.tsx   Операції → Категорії
        payments/page.tsx                Платежі → Найближчі
        payments/subscriptions/page.tsx
        payments/subscriptions/[subscriptionId]/page.tsx
        payments/credits/page.tsx
        payments/credits/[creditId]/page.tsx
        payments/debts/page.tsx
        payments/debts/[debtId]/page.tsx
        calendar/page.tsx                Календар (режим і фільтри в URL)
        budget/page.tsx                  Бюджет → Місяць
        budget/goals/page.tsx            Бюджет → Цілі та конверти
        budget/goals/[reserveId]/page.tsx
        budget/big-expenses/page.tsx     Бюджет → Великі витрати
        auto/page.tsx                    Авто → Огляд
        auto/fuel/page.tsx               Авто → Заправки
        auto/service/page.tsx            Авто → Ремонт і обслуговування
        auto/plan/page.tsx               Авто → План робіт
        taxes/page.tsx                   Податки → Огляд
        taxes/liabilities/page.tsx       Податки → Зобов'язання
        taxes/liabilities/[liabilityId]/page.tsx
        taxes/payments/page.tsx          Податки → Історія оплат
        taxes/settings/page.tsx          Податки → Налаштування
        statistics/page.tsx
        notifications/page.tsx           центр сповіщень (повний список)
        settings/page.tsx                профіль, мова, вигляд; простір: назва, валюта, часовий пояс, тиждень
        settings/access/page.tsx         Налаштування → Доступ: учасники, ролі, запросити, відкликати
        settings/currencies/page.tsx
        settings/reminders/page.tsx
        settings/calendars/page.tsx
        settings/data/page.tsx           офлайн, експорт, видалення
        settings/security/page.tsx
        more/page.tsx                    mobile «Ще»
      api/
        cron/reminders/route.ts
        cron/calendar-sync/route.ts
        cron/daily/route.ts
        invites/accept/route.ts          акаунт для запрошеного (service role, лише за дійсним токеном)
        integrations/google/start/route.ts
        integrations/google/callback/route.ts
        integrations/google/webhook/route.ts
        integrations/icloud/connect/route.ts
    features/
      auth/  ledgers/  overview/  operations/  accounts/  categories/  currencies/  obligations/
      subscriptions/  credits/  debts/  budget/  reserves/  big-expenses/  auto/  taxes/
      calendar/  notifications/  calendar-sync/  statistics/  settings/  data-export/  search/
    components/
      ui/                                button.component.tsx, amount.component.tsx, money-input.component.tsx …
      layout/                            sidebar, topbar, tab-bar, fab, sync-status, app-providers
    contexts/                            clock.context.tsx, ledger.context.tsx (активний простір і роль)
    store/                               ui.store.ts, drafts.store.ts
    lib/
      env.ts
      auth/dal.server.ts
      supabase/browser-client.ts  server-client.ts  admin-client.server.ts  pg-error.utils.ts
      query/query-client.ts  idb-persister.ts
      money/money.utils.ts  fx.utils.ts
      recurrence/recurrence.utils.ts
      finance/available-money.utils.ts  reserve-allocation.utils.ts
      utils/cn.utils.ts
    hooks/                               media-query.hook.ts, online-status.hook.ts
    constants/                           navigation.constants.ts, query-roots.constants.ts, currencies.constants.ts
    types/                               database.types.ts (згенеровано), supabase.types.ts (SaldoClient), money.types.ts, sync.types.ts
    mcp/                                 фаза 10: server.server.ts, tools/<feature>.tools.server.ts
```

Одна фіча повністю (на прикладі `subscriptions`):

```
src/features/subscriptions/
  subscriptions.types.ts
  subscriptions.constants.ts
  api/subscriptions.api.ts               supabase-js: select, upsert, rpc
  api/subscriptions.queries.ts           ключі + queryOptions
  api/subscriptions.mutations.ts         registerSubscriptionMutations + useXxx хуки
  components/subscription-list.component.tsx
  components/subscription-form.component.tsx
  hooks/subscription-filters.hook.ts     useSubscriptionFilters (nuqs)
  schemas/subscription-form.schema.ts
  utils/subscription-cost.utils.ts       нормалізована середньомісячна вартість
  utils/subscription-cost.utils.test.ts
```

## 2. Суфікси

| Суфікс | Призначення | Приклад |
|---|---|---|
| `.component.tsx` | React-компонент | `src/features/operations/components/operation-row.component.tsx` |
| `.hook.ts` | хук; файл `x-y.hook.ts` експортує `useXY` | `src/features/subscriptions/hooks/subscription-filters.hook.ts` → `useSubscriptionFilters` |
| `.context.tsx` | контекст + провайдер + хук, лише DI | `src/contexts/clock.context.tsx` |
| `.store.ts` | zustand-store UI-стану | `src/store/ui.store.ts` |
| `.api.ts` | виклики supabase-js (select, upsert, rpc) | `src/features/obligations/api/obligations.api.ts` |
| `.queries.ts` | фабрика ключів + `queryOptions` | `src/features/operations/api/operations.queries.ts` |
| `.mutations.ts` | `register…Mutations` (`setMutationDefaults`) + `useMutation`-хуки | `src/features/operations/api/operations.mutations.ts` |
| `.schema.ts` | zod-схема | `src/features/operations/schemas/operation-form.schema.ts` |
| `.types.ts` | типи фічі або спільні | `src/features/taxes/taxes.types.ts`, `src/types/money.types.ts` |
| `.constants.ts` | константи | `src/constants/navigation.constants.ts` |
| `.utils.ts` | чисті функції домену, без React і мережі | `src/lib/recurrence/recurrence.utils.ts` |
| `.actions.ts` | `"use server"` (поки не використовується) | `src/features/auth/api/auth.actions.ts` |
| `.server.ts` | лише сервер, `import 'server-only'` | `src/features/notifications/api/web-push.server.ts` |
| `.mock.ts` | демо-дані для розробки | `src/features/subscriptions/api/subscriptions.mock.ts` |
| `.test.ts` | Vitest поруч із файлом | `src/lib/money/money.utils.test.ts` |
| `.e2e.ts` | Playwright-сценарій, лише в `e2e/` (Vitest бере тільки `src/**/*.test.ts`) | `e2e/sharing/editor-operation.e2e.ts` |
| `.fixture.ts` | фікстури й дані e2e | `e2e/fixtures/roles.fixture.ts` |
| `.setup.ts` | setup-проєкт Playwright | `e2e/auth.setup.ts` |

Без суфіксів: reserved-файли Next (`page`, `layout`, `loading`, `error`, `not-found`, `route`, `proxy`, `manifest`),
а також `src/lib/env.ts`, клієнти supabase, `database.types.ts` (згенерований). `"use client"` пишеться у файлі.

## 3. Імпорти

- Псевдонім `@/` → `src/`. Відносні імпорти — лише всередині однієї фічі.
- Кожен файл імпортується за своїм шляхом; `index.ts`-реекспорти заборонені (Biome `noBarrelFile`, `noReExportAll`).
- `src/features/A` не імпортує `src/features/B` (dependency-cruiser). Композиція — у `src/app/**` і `src/components/layout/**`.
- `src/lib`, `src/components/ui`, `src/hooks`, `src/constants`, `src/types`, `src/store`, `src/contexts` не імпортують `src/features`.
- `*.server.ts` і `admin-client.server.ts` імпортуються лише з `route.ts`, `page.tsx`, `layout.tsx` та інших `*.server.ts`.
- Інвалідація між фічами — через корені з `src/constants/query-roots.constants.ts`, не через чужі фабрики ключів.
- Крос-фічеві дії (оплатити, додати) — посиланням із параметром URL (`?pay=<id>`), не імпортом компонента.
- `src/mcp/**` (фаза 10) — ще один шар композиції, як `src/app`: імпортує з фіч лише `api/*.api.ts`, `schemas/`,
  `utils/`, `*.types.ts`; фічі й `src/lib` не імпортують `src/mcp`.

Правила під MCP — з першого рядка коду (`docs/architecture.md` §12):
- `*.api.ts` не імпортує React, TanStack, `next/*` і не створює клієнт сам: перший параметр — `db: SaldoClient`
  (`SupabaseClient<Database>` з `src/types/supabase.types.ts`). Браузерний клієнт передає `*.mutations.ts`/`*.queries.ts`.
- Ввід кожної дії запису — окрема zod-схема `<action>-input.schema.ts` у грошах мінорних одиниць (`amountMinor: z.int()`,
  `currency`, `id: z.uuid()`), без `transform`; `*.api.ts` робить `parse` перед `rpc()`. Форма має свою схему
  (рядок суми тощо) і чисту функцію `to<Action>Input(values, clock)` → input-схема. MCP бере input-схему як `inputSchema`.
- Читання, з яких UI рахує цифри (Огляд, «Доступно», календар), — теж функції `*.api.ts` + чисті `*.utils.ts`;
  хук лише викликає їх. Чисті функції отримують `now` і `timeZone` параметрами, не з контексту.
- Будь-який запис у БД — лише через функцію `*.api.ts` (RPC або одна таблиця); жодних прямих `from().insert` у
  компонентах, хуках чи маршрутах.

## 4. Патерни

### 4.1 Ключі й `queryOptions`

```ts
// src/features/operations/api/operations.queries.ts
import { queryOptions } from '@tanstack/react-query'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import type { OperationFilters } from '../operations.types'
import { fetchOperation, fetchOperations } from './operations.api'

// ключ: [root, ledgerId, …] — кеш двох просторів не змішується, root лишається першим для isMoneyQuery
export const operationKeys = {
  all: (ledgerId: string) => ['operations', ledgerId] as const,
  lists: (ledgerId: string) => [...operationKeys.all(ledgerId), 'list'] as const,
  list: (ledgerId: string, filters: OperationFilters) => [...operationKeys.lists(ledgerId), filters] as const,
  detail: (ledgerId: string, id: string) => [...operationKeys.all(ledgerId), 'detail', id] as const,
}

export const operationQueries = {
  list: (ledgerId: string, filters: OperationFilters) =>
    queryOptions({ queryKey: operationKeys.list(ledgerId, filters), queryFn: () => fetchOperations(getBrowserSupabase(), ledgerId, filters), staleTime: 30_000 }),
  detail: (ledgerId: string, id: string) =>
    queryOptions({ queryKey: operationKeys.detail(ledgerId, id), queryFn: () => fetchOperation(getBrowserSupabase(), id) }),
}

// у компоненті: const { ledgerId } = useLedger(); const { data } = useQuery(operationQueries.list(ledgerId, filters))
```

```ts
// src/constants/query-roots.constants.ts
export const MONEY_QUERY_ROOTS = ['operations', 'accounts', 'obligations', 'reserves', 'overview', 'budget', 'calendar', 'statistics', 'taxes'] as const
export const isMoneyQuery = (q: { queryKey: readonly unknown[] }) =>
  (MONEY_QUERY_ROOTS as readonly unknown[]).includes(q.queryKey[0])
```

### 4.2 Мутація з `setMutationDefaults` і UUID клієнта

```ts
// src/features/operations/api/operations.mutations.ts
import { type QueryClient, useMutation } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { isMoneyQuery } from '@/constants/query-roots.constants'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import type { Operation, OperationInsert } from '../operations.types'
import { createOperation } from './operations.api'
import { operationKeys } from './operations.queries'

export const createOperationKey = ['operations', 'create'] as const

// викликається в app-providers ДО гідрації persist, щоб відновлена черга знала mutationFn
export function registerOperationMutations(queryClient: QueryClient) {
  queryClient.setMutationDefaults(createOperationKey, {
    mutationFn: (input: OperationInsert) => createOperation(getBrowserSupabase(), input),
    scope: { id: 'writes' },
    networkMode: 'offlineFirst',
    retry: 3,
    onMutate: async (input: OperationInsert) => {
      await queryClient.cancelQueries({ queryKey: operationKeys.lists() })
      queryClient.setQueriesData<Operation[]>({ queryKey: operationKeys.lists() }, (rows = []) => [
        { ...input, syncState: 'pending' } as Operation,
        ...rows,
      ])
    },
    onSettled: () => queryClient.invalidateQueries({ predicate: isMoneyQuery }),
  })
}

export function useCreateOperation() {
  return useMutation<Operation, PostgrestError, OperationInsert>({ mutationKey: createOperationKey })
}

// виклик: id створюється ДО mutate, тож повтор після reload несе той самий ключ ідемпотентності
// createOperation.mutate({ ...toOperationInsert(values), id: crypto.randomUUID() })
```

```ts
// src/features/operations/api/operations.api.ts
import type { SaldoClient } from '@/types/supabase.types'
import type { Operation } from '../operations.types'
import { type OperationInsert, operationInsertSchema } from '../schemas/create-operation-input.schema'

export async function createOperation(db: SaldoClient, input: OperationInsert): Promise<Operation> {
  const { data, error } = await db.rpc('create_operation', { p_operation: operationInsertSchema.parse(input) })
  if (error) throw error
  return data
}
```

### 4.3 RPC з кількома таблицями

```ts
// src/features/obligations/api/obligations.api.ts
// db — браузерний клієнт із mutations.ts або клієнт із JWT власника з src/mcp (фаза 10)
export async function payObligation(db: SaldoClient, raw: PayObligationInput) {
  const input = payObligationInputSchema.parse(raw) // schemas/pay-obligation-input.schema.ts
  const { data, error } = await db.rpc('pay_obligation', {
    p_payment_id: input.paymentId,          // UUID клієнта
    p_obligation_id: input.obligationId,
    p_amount_minor: input.amountMinor,
    p_operation: input.newOperation ?? null, // з власним UUID
    p_existing_operation_id: input.existingOperationId ?? null,
    p_reserve_id: input.reserveId ?? null,
    p_settle: input.settle,
  })
  if (error) throw error // PT409 → conflict, 23514 → поле, див. pg-error.utils
  return data
}
```

```sql
-- supabase/migrations/…_pay_obligation.sql (уривок)
create function public.pay_obligation(p_payment_id uuid, p_obligation_id uuid, p_amount_minor bigint,
  p_operation jsonb default null, p_existing_operation_id uuid default null,
  p_reserve_id uuid default null, p_settle boolean default false)
returns setof public.obligation_states
language plpgsql security invoker set search_path = '' as $$
declare v_operation_id uuid := coalesce(p_existing_operation_id, (p_operation->>'id')::uuid);
begin
  if num_nonnulls(p_operation, p_existing_operation_id) <> 1 then
    raise exception 'exactly one operation source' using errcode = '22023';
  end if;
  if p_operation is not null then
    insert into public.operations select * from jsonb_populate_record(null::public.operations, p_operation)
    on conflict (id) do nothing;
  end if;
  insert into public.obligation_payments (id, obligation_id, operation_id, amount_minor)
  values (p_payment_id, p_obligation_id, v_operation_id, p_amount_minor)
  on conflict (id) do nothing;
  -- далі: spend-рух резерву, settled_at, перевірка суми частин операції, sync_jobs
  return query select * from public.obligation_states where obligation_id = p_obligation_id;
end $$;
```

### 4.4 zod-схема + форма RHF

```ts
// src/features/operations/schemas/operation-form.schema.ts
import { z } from 'zod'
import { CURRENCIES } from '@/constants/currencies.constants'

export const operationFormSchema = z.object({
  kind: z.enum(['income', 'expense', 'refund', 'adjustment']),
  amount: z.string().regex(/^\d+([.,]\d{1,2})?$/, 'Сума з двома знаками'),
  currency: z.enum(CURRENCIES),
  accountId: z.uuid(),
  categoryId: z.uuid().nullable(),
  occurredOn: z.iso.date(),
  note: z.string().trim().max(500).default(''),
}).refine((v) => v.kind !== 'adjustment' || v.note.length > 0, {
  path: ['note'],
  message: 'Коригування пояснюється приміткою',
})
```

```tsx
// src/features/operations/components/operation-form.component.tsx (уривок)
'use client'
const form = useForm<z.input<typeof operationFormSchema>, unknown, z.output<typeof operationFormSchema>>({
  resolver: zodResolver(operationFormSchema),
  defaultValues,
})
const create = useCreateOperation()

const onSubmit = form.handleSubmit((values) =>
  create.mutate(
    { ...toOperationInsert(values, clock), id: crypto.randomUUID() },
    { onError: (error) => applyPgError(error, form.setError) },
  ),
)
```

```ts
// src/lib/supabase/pg-error.utils.ts (уривок)
const CONSTRAINT_FIELDS: Record<string, string> = {
  operations_amount_positive: 'amount',
  operations_adjustment_note: 'note',
  transfers_distinct_accounts: 'toAccountId',
}
export function mapPgError(error: { code?: string; message: string; details?: string }) {
  if (error.code === 'PT409') return { kind: 'conflict' } as const
  const constraint = /constraint "([^"]+)"/.exec(error.message)?.[1]
  const field = constraint ? CONSTRAINT_FIELDS[constraint] : undefined
  return field ? ({ kind: 'field', field } as const) : ({ kind: 'unknown' } as const)
}
```

### 4.5 Zustand UI-store

```ts
// src/store/ui.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UiState = { amountsHidden: boolean; sidebarCollapsed: boolean; toggleAmounts: () => void }

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      amountsHidden: false,
      sidebarCollapsed: false,
      toggleAmounts: () => set((s) => ({ amountsHidden: !s.amountsHidden })),
    }),
    { name: 'saldo-ui', skipHydration: true }, // rehydrate() у useEffect після монтування
  ),
)
```

### 4.6 Контекст для DI

```tsx
// src/contexts/clock.context.tsx
'use client'
import { TZDate } from '@date-fns/tz'
import { createContext, use } from 'react'

type Clock = { timeZone: string; now: () => TZDate }
const ClockContext = createContext<Clock | null>(null)

export function ClockProvider({ timeZone, children }: { timeZone: string; children: React.ReactNode }) {
  return <ClockContext value={{ timeZone, now: () => TZDate.tz(timeZone) }}>{children}</ClockContext>
}

export function useClock() {
  const clock = use(ClockContext)
  if (!clock) throw new Error('useClock outside ClockProvider')
  return clock
}
```

### 4.7 Чиста функція + тест

```ts
// src/lib/finance/available-money.utils.ts
export type AvailableInput = {
  balances: { accountId: string; baseMinor: number | null }[]        // лише include_in_available
  reserves: { reserveId: string; baseMinor: number }[]
  obligations: { id: string; dueOn: string; remainingBaseMinor: number | null; envelopeId: string | null }[]
  reserveById: Record<string, number>                                 // залишок конверта в базовій валюті
}
export type AvailableResult = {
  totalMinor: number
  balancesMinor: number
  reservesMinor: number
  uncoveredMinor: number
  unknownAmountIds: string[]   // невідома сума: не віднімається, показується окремо
  incomplete: boolean          // є рахунок без курсу
}

export function computeAvailable(input: AvailableInput): AvailableResult {
  const balancesMinor = input.balances.reduce((s, b) => s + (b.baseMinor ?? 0), 0)
  const reservesMinor = input.reserves.reduce((s, r) => s + r.baseMinor, 0)
  const left = { ...input.reserveById }
  let uncoveredMinor = 0
  const unknownAmountIds: string[] = []
  for (const o of [...input.obligations].sort((a, b) => a.dueOn.localeCompare(b.dueOn))) {
    if (o.remainingBaseMinor === null) { unknownAmountIds.push(o.id); continue }
    const cover = o.envelopeId ? Math.min(left[o.envelopeId] ?? 0, o.remainingBaseMinor) : 0
    if (o.envelopeId) left[o.envelopeId] = (left[o.envelopeId] ?? 0) - cover
    uncoveredMinor += o.remainingBaseMinor - cover
  }
  return {
    totalMinor: balancesMinor - reservesMinor - uncoveredMinor,
    balancesMinor, reservesMinor, uncoveredMinor, unknownAmountIds,
    incomplete: input.balances.some((b) => b.baseMinor === null),
  }
}
```

```ts
// src/lib/finance/available-money.utils.test.ts
import { describe, expect, it } from 'vitest'
import { computeAvailable } from './available-money.utils'

describe('computeAvailable', () => {
  it('не віднімає податок, покритий податковим резервом, удруге (§3)', () => {
    const r = computeAvailable({
      balances: [{ accountId: 'a', baseMinor: 100_000 }],
      reserves: [{ reserveId: 'tax', baseMinor: 30_000 }],
      reserveById: { tax: 30_000 },
      obligations: [{ id: 't1', dueOn: '2026-11-20', remainingBaseMinor: 30_000, envelopeId: 'tax' }],
    })
    expect(r.totalMinor).toBe(70_000)
    expect(r.uncoveredMinor).toBe(0)
  })

  it('невідома сума не стає нулем, а виноситься окремо', () => {
    const r = computeAvailable({
      balances: [{ accountId: 'a', baseMinor: 10_000 }], reserves: [], reserveById: {},
      obligations: [{ id: 'x', dueOn: '2026-11-01', remainingBaseMinor: null, envelopeId: null }],
    })
    expect(r.totalMinor).toBe(10_000)
    expect(r.unknownAmountIds).toEqual(['x'])
  })
})
```

## 5. Конфіги (ескізи, конфіг не запускався)

### 5.1 Biome

```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.4/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "includes": ["src/**", "e2e/**", "*.ts", "!src/types/database.types.ts", "!e2e/.auth"] },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 120 },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "asNeeded" } },
  "linter": {
    "rules": {
      "preset": "recommended",
      "style": {
        "useFilenamingConvention": { "level": "error", "options": { "filenameCases": ["kebab-case"], "requireAscii": true } }
      },
      "performance": { "noBarrelFile": "error", "noReExportAll": "error" }
    }
  },
  "assist": { "actions": { "source": { "organizeImports": "on" } } }
}
```

`kebab-case` перевіряє кожну частину між крапками окремо, тож `account-card.component.tsx`,
`editor-operation.e2e.ts` і `playwright.config.ts` проходять (libraries.md). Папки `[accountId]` — не файли, правило їх не чіпає.

### 5.2 dependency-cruiser — межі фіч і переносний `*.api.ts`

```js
// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    {
      name: 'no-cross-feature',
      comment: 'Фічі не імпортують одна одну; спільне — у src/lib, src/components, src/types',
      severity: 'error',
      from: { path: '^src/features/([^/]+)/' },
      to: { path: '^src/features/([^/]+)/', pathNot: '^src/features/$1/' },
    },
    {
      name: 'api-is-portable',
      comment: '*.api.ts викликається і з браузера, і з MCP-сервера (фаза 10)',
      severity: 'error',
      from: { path: '^src/features/[^/]+/api/[^/]+\\.api\\.ts$' },
      // no ^ before node_modules: pnpm resolves to node_modules/.pnpm/<pkg>@<v>/node_modules/<pkg>/
      to: { path: '(node_modules/(react|react-dom|next|@tanstack)/|^src/lib/supabase/browser-client)' },
    },
  ],
  options: { tsConfig: { fileName: 'tsconfig.json' }, doNotFollow: { path: 'node_modules' } },
}
```

Версія: `dependency-cruiser@18.7.0` (MIT, 19.10.2026, Node `^22||^24||>=26`). Запуск: `depcruise src --config .dependency-cruiser.cjs`. Правило «shared не імпортує features» (§3 цього
документа) за потреби додається другим записом з `from: { path: '^src/(lib|components/ui|hooks|constants|types|store|contexts)/' }`.

### 5.2a knip

```json
{
  "$schema": "https://unpkg.com/knip@6/schema.json",
  "entry": ["src/proxy.ts"],
  "ignore": ["src/types/database.types.ts"],
  "ignoreBinaries": ["gitleaks"]
}
```

`knip@6.44.0`: плагіни Next, Vitest, Playwright, lefthook і Biome вмикаються самі за наявними конфігами (точки
входу `src/app/**`, `*.test.ts`, `*.e2e.ts`, `*.setup.ts`). `gitleaks` ставиться через brew, тому в
`ignoreBinaries`. Запуск: `knip`.

### 5.3 Vitest

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'], coverage: { provider: 'v8', include: ['src/**/*.utils.ts', 'src/**/*.schema.ts'] } },
})
```

### 5.4 lefthook

```yaml
pre-commit:
  parallel: true
  commands:
    biome: { glob: '*.{ts,tsx,json,css}', run: 'pnpm biome check --staged --no-errors-on-unmatched {staged_files}' }
    types: { run: 'pnpm typecheck' }
    deps: { run: 'pnpm depcruise src --config .dependency-cruiser.cjs' }
    secrets: { run: 'gitleaks git --pre-commit --staged --redact' }
```

### 5.5 Скрипти `package.json`

```json
{
  "lint": "biome check .",
  "format": "biome format --write .",
  "typecheck": "next typegen && tsc --noEmit",
  "deps": "depcruise src --config .dependency-cruiser.cjs",
  "test": "vitest run",
  "test:db": "supabase test db",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "check": "biome check . && pnpm typecheck && depcruise src --config .dependency-cruiser.cjs && knip && vitest run && supabase test db",
  "db:types": "supabase gen types typescript --local > src/types/database.types.ts"
}
```

`next typegen` перед `tsc` генерує глобальні `LayoutProps` / `PageProps` і типи `typedRoutes` у `.next/types`.
`supabase test db` у `check` потребує запущеного локального стеку (`supabase start`).

`pnpm check` e2e не запускає: він повільний (збірка + браузер). E2E — `pnpm test:e2e` локально перед PR фази й
окремий job `e2e` у CI.

### 5.6 Playwright

```ts
// playwright.config.ts
import { execSync } from 'node:child_process'
import { defineConfig, devices } from '@playwright/test'

// Ключі локального стеку — з `supabase status`, а не з файлів: у git їх немає, прод сюди потрапити не може
const local = JSON.parse(execSync('supabase status -o json', { encoding: 'utf8' }))
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(local.API_URL)) throw new Error('e2e лише проти локального Supabase')

const PORT = 3100 // не 3000: не перевикористати pnpm dev з іншим env
const env = {
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY, // назви ключів звірити з виводом CLI у фазі 0
  SUPABASE_SECRET_KEY: local.SECRET_KEY,
  CRON_SECRET: 'e2e-local-cron-secret',
}
Object.assign(process.env, env) // global-setup і фікстури читають ті самі значення

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1, // одна база на прогін; паралельність не варта гемору з ізоляцією
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: env.NEXT_PUBLIC_SITE_URL,
    locale: 'uk-UA',
    timezoneId: 'Europe/Kyiv',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: '**/*.setup.ts' },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/, dependencies: ['setup'] },
  ],
  webServer: {
    // прод-збірка, як радить гайд Next: Serwist і service worker працюють лише в ній, і без холодної компіляції dev
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: env.NEXT_PUBLIC_SITE_URL,
    env,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
  },
})
```

WebKit і Firefox не запускаються: iOS перевіряється вручну на телефоні (див. §6.3, офлайн).

## 6. Тести

Три рівні, кожен перевіряє своє й не дублює інші:

| Рівень | Що | Де | Команда |
|---|---|---|---|
| unit | чисте ядро: гроші, курси, повторення, «Доступно», резерви, податки, схеми, мапінг помилок | `src/**/*.test.ts` | `pnpm test` (у `pnpm check`) |
| БД | RLS кожної таблиці на чотирьох ролях, інваріанти RPC (`42501`, `PT409`, складені FK) | `supabase/tests/*.test.sql` | `pnpm test:db` (у `pnpm check`) |
| e2e | головні потоки кожної фази через UI: дві людини, ролі в інтерфейсі, офлайн | `e2e/**/*.e2e.ts` | `pnpm test:e2e` (окремо) |

Межа: перестановки прав (хто що бачить у кожній таблиці) — лише pgTAP; e2e бере по одному сценарію «UI ховає дію
і сервер відмовляє». Формули — лише unit; e2e перевіряє, що число дійшло до екрана один раз.

### 6.1 Unit (Vitest)

Лише чисте ядро (`*.utils.ts`, `*.schema.ts`), файл `*.test.ts` поруч:

- гроші: `toMinor`/`fromMinor`, форматування, «−», безпечні цілі;
- курси: конвертація, округлення `half_even`/`half_up`/`down`, невідомий курс;
- повторення: короткі місяці (3 правила), 29 лютого, N днів через DST, часовий пояс Europe/Kyiv;
- доступні гроші й розподіл резервів;
- графік розстрочки (рівні внески, останній внесок, сума = загальна);
- податки: розрахунок бази, версія правила за датою, різниця при перегляді, переплата;
- допоміжні функції ідемпотентності й черги (злиття оптимістичного рядка з серверним за `id`);
- zod-схеми форм (зокрема `refine` з `path`);
- мапінг помилок Postgres.

Не тестуються у Vitest: async Server Components, виклики supabase, розмітка shadcn — це рівень e2e.
RPC-інваріанти без UI — pgTAP або ручна перевірка за «Готово, коли» (`docs/architecture.md`, §11).

### 6.2 БД (pgTAP)

`supabase test db` — RLS кожної таблиці й запрошень (§0), обов'язковий з першої міграції. Файл — одна транзакція
(`begin` … `rollback`), користувачі — прямий insert у `auth.users` (тригер дає простір), вхід —
`pg_temp.login(uuid)`: `set_config('request.jwt.claims', …)` + `set_config('role', 'authenticated', true)`, назад —
`reset role` (взірець — `supabase/tests/ledgers.test.sql`). `basejump-supabase_test_helpers` не беремо: dbdev
ставиться в БД через `pg_tle` + `http` запитом до api.database.dev з вшитим JWT на кожному `supabase start` / в CI —
мережа в тестах і JWT у публічному репо заради чотирьох рядків хелпера.

### 6.3 E2E (Playwright)

**Середовище.** Лише локальний стек: `supabase start`, потім `pnpm test:e2e`. Конфіг (§5.6) бере ключі з
`supabase status` і падає, якщо URL не `127.0.0.1`/`localhost`. Застосунок — `next build && next start` на порту 3100
через `webServer` (локально перевикористовується вже запущений). Лише Chromium: проєкт `desktop` і `mobile`
(Pixel 7, лише тести з тегом `@mobile`).

**База.** `e2e/global-setup.ts` раз на прогін робить `supabase db reset` (міграції + `seed.sql`), створює чотирьох
користувачів і вигадані демо-дані. Транзакції не підходять: застосунок ходить у Postgres через PostgREST окремими
з'єднаннями, тест не може загорнути їх у свою транзакцію. `E2E_SKIP_RESET=1` пропускає reset для швидких локальних
перезапусків, тож тест не покладається на «чисту» базу: створює свої записи з унікальною міткою
(`e2e-${crypto.randomUUID().slice(0, 8)}`) і шукає саме їх. Тест, що перевіряє суми («Доступно», підсумки місяця)
або відкликає доступ, створює собі окремий простір через admin-клієнт.

**Ролі.** `global-setup.ts` через `auth.admin.createUser({ email, password, email_confirm: true })` (працює й при
вимкненій реєстрації) створює `owner`, `editor`, `viewer`, `stranger` з адресами `*@example.com` (RFC 2606); тригер
дає кожному власний простір; `editor` і `viewer` додаються в простір `owner` прямим insert у `ledger_members`
(secret-ключ оминає RLS). Запрошення як потік перевіряє окремий e2e фази 1. `auth.setup.ts` входить через `/login`
кожною роллю й зберігає `e2e/.auth/<role>.json` — так cookie `@supabase/ssr` справжні. Пароль — константа у
`users.fixture.ts`: це локальний стек, не секрет.

**Дані.** Лише вигаданий набір із `docs/design/demo-data.md` (`demo-data.fixture.ts`) і мітки `e2e-…`. Суми, назви й
контрагенти з §25 і `.private/` заборонені — репозиторій публічний, а трейси й скриншоти CI може завантажити будь-хто
з акаунтом GitHub. У трейсах є JWT локального стеку — вони підписані стандартним ключем `supabase start` і поза
машиною нічого не відкривають. `e2e/.auth/`, `playwright-report/`, `test-results/` — у `.gitignore`; в артефакт CI
йдуть лише `playwright-report/` і `test-results/`, `.auth/` — ні.

**Локатори.** Як бачить користувач: `getByRole('button', { name: 'Зберегти' })`, `getByLabel('Сума')`,
`getByRole('row', { name: /e2e-1a2b/ })`, тексти українською з інтерфейсу. `getByTestId` — лише там, де немає ролі й
тексту (клітинка календаря, графік). CSS-класи й XPath — ні. Очікування — `expect(...).toBeVisible()` /
`toHaveText`, без `waitForTimeout`.

**Дві ролі в одному тесті.** Фікстура `pageAs(role)` відкриває окремий `BrowserContext` зі `storageState` ролі.
Контекст, створений вручну, не успадковує `use` з конфігу, тому `baseURL`, `locale`, `timezoneId` передаються явно:

```ts
// e2e/fixtures/roles.fixture.ts
import { type BrowserContext, type Page, test as base } from '@playwright/test'

export type Role = 'owner' | 'editor' | 'viewer' | 'stranger'

export const test = base.extend<{ pageAs: (role: Role) => Promise<Page> }>({
  pageAs: async ({ browser, baseURL, locale, timezoneId }, use) => {
    const opened: BrowserContext[] = []
    await use(async (role) => {
      const ctx = await browser.newContext({ baseURL, locale, timezoneId, storageState: `e2e/.auth/${role}.json` })
      opened.push(ctx)
      return ctx.newPage()
    })
    await Promise.all(opened.map((c) => c.close()))
  },
})
```

```ts
// e2e/sharing/editor-operation.e2e.ts
import { expect } from '@playwright/test'
import { test } from '../fixtures/roles.fixture'

test('editor вносить витрату — owner бачить її з автором', async ({ pageAs }) => {
  const mark = `e2e-${crypto.randomUUID().slice(0, 8)}`
  const editor = await pageAs('editor')
  await editor.goto('/operations?add=expense')
  await editor.getByLabel('Сума').fill('125,50')
  await editor.getByLabel('Коментар').fill(mark)
  await editor.getByRole('button', { name: 'Зберегти' }).click()

  const owner = await pageAs('owner')
  await owner.goto('/operations')
  await expect(owner.getByRole('row', { name: new RegExp(mark) })).toContainText('О') // ініціал автора
})
```

**Офлайн (фаза 8).** `context.setOffline(true)` → дія → `SyncStatus` «Очікує (1)» → `setOffline(false)` → «Синхронізовано»
і рядок видно іншій ролі. Конфлікт `PT409`: owner онлайн оплачує платіж, editor офлайн оплачує той самий, повертає
мережу — один запис і стан «Конфлікт» з «Підтвердив(ла) …». Офлайн-перезавантаження — лише в прод-збірці (service
worker). У WebKit `setOffline` ламає навігацію під service worker (microsoft/playwright#42775) — ще одна причина
перевіряти iOS вручну.

**Web Push.** E2E: стани дозволу (`context.grantPermissions(['notifications'])` / відмова → пояснення), рядок у
`push_subscriptions` після «Увімкнути», виклик `/api/cron/reminders` з `CRON_SECRET` створює запис у центрі
сповіщень рівно один раз. Доставку через APNs/FCM, показ сповіщення при закритій вкладці й iOS Home Screen —
лише вручну (Готово, коли фази 3): headless-браузер не отримує push від реальних сервісів.

**CI.** Job `e2e` у `ci.yml` (без secrets, `permissions: contents: read`), паралельно з `check`:

```yaml
e2e:
  runs-on: ubuntu-latest
  timeout-minutes: 20
  steps:
    - uses: actions/checkout@v5
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v5
      with: { node-version: 24, cache: pnpm }
    - run: pnpm install --frozen-lockfile
    - uses: supabase/setup-cli@v1
      with: { version: 2.122.0 }
    - run: supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor
    - id: pw
      run: echo "version=$(pnpm exec playwright --version | cut -d' ' -f2)" >> "$GITHUB_OUTPUT"
    - uses: actions/cache@v4
      id: pw-cache
      with: { path: ~/.cache/ms-playwright, key: pw-${{ runner.os }}-${{ steps.pw.outputs.version }} }
    - if: steps.pw-cache.outputs.cache-hit != 'true'
      run: pnpm exec playwright install --with-deps chromium
    - if: steps.pw-cache.outputs.cache-hit == 'true'
      run: pnpm exec playwright install-deps chromium
    - run: pnpm test:e2e
    - if: failure()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        retention-days: 7
        path: |
          playwright-report/
          test-results/
```

`supabase start` (а не `supabase db start`) — інакше Auth і ключі не підіймуться (supabase discussion #32522).
Оцінка часу: стек 2–3 хв (образи Docker), install ~0,5 хв, `next build` 1–2 хв, Chromium ~1 хв (з кешем ~10 с),
тести 2–5 хв — разом 7–12 хв на PR; Actions для публічного репо безкоштовні.

**Сценарії.** По 2–6 на фазу, лише головні потоки (`docs/plan.md`, пункти «E2E» кожної фази). Новий баг, який
дійшов до UI, — спершу unit або pgTAP; e2e додається, лише якщо зламався саме потік.

## 7. Міграції й типи

- `supabase migration new <snake_name>`; одна міграція — одна логічна зміна; спершу локально (`supabase start`,
  `supabase db reset`, `supabase test db`), прод — `supabase db push`. Supabase MCP — лише огляд, advisors і типи;
  `apply_migration` у віддалений проєкт не робиться: репо — джерело правди схеми.
- Імена обмежень явні: `<table>_<rule>`; політики RLS `<table>_read` / `<table>_write` (особисті — `<table>_self`);
  індекси `<table>_<cols>_idx`.
- Після міграції: `pnpm db:types`; згенерований файл не правиться руками.

## 8. Коміти

- Conventional Commits: `feat(operations): переказ із комісією`, `fix(recurrence): лютий для правила skip`,
  `chore(db): міграція obligations`.
- Один коміт — одна логічна зміна; `pnpm check` зелений.
- Без `Co-Authored-By: Claude`, без «Generated with Claude Code» і будь-яких згадок AI у комітах і PR.
- Секрети, `.env*`, дампи БД у git не потрапляють. Репозиторій публічний: gitleaks у pre-commit і push protection
  на GitHub; хибне спрацювання — `gitleaks:allow` у рядку з поясненням, не `--no-verify`.
