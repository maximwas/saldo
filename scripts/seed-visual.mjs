// Fills demo@example.com (made by supabase/seed.sql) with the rest of docs/design/demo-data.md for the visual tests:
// October operations, the EUR → card transfer, the October budget and the two categories seed.sql lacks.
// Local stack only; run after `supabase db reset`. Writes go through the app's RPCs as the demo user (RLS applies).
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  execSync('pnpm exec supabase status -o env', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => {
      const [key, ...rest] = line.split('=')

      return [key, rest.join('=').replace(/^"|"$/g, '')]
    }),
)

if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(env.API_URL ?? '')) {
  throw new Error('seed-visual runs only against the local Supabase stack')
}

const client = createClient(env.API_URL, env.PUBLISHABLE_KEY, { auth: { persistSession: false } })
const login = await client.auth.signInWithPassword({
  email: 'demo@example.com',
  password: 'saldo-demo-local-password',
})

if (login.error) {
  throw new Error(`seed-visual: demo login failed (run supabase db reset first): ${login.error.message}`)
}

const must = ({ data, error }, step) => {
  if (error) {
    throw new Error(`seed-visual: ${step}: ${error.message}`)
  }

  return data
}

const ledgerId = must(await client.from('user_settings').select('last_ledger_id').single(), 'ledger').last_ledger_id
const CARD = 'de000000-0000-4000-8000-0000000000a1'
const EUR = 'de000000-0000-4000-8000-0000000000a3'
const id = (seq) => `de000000-0000-4000-8000-${String(seq).padStart(12, '0')}`

// colours and icons of the Figma default categories table 13:74335; entertainment plum (Figma), telecom teal (demo-data.md)
const CATEGORIES = {
  Житло: ['blue', 'house'],
  Продукти: ['green', 'shopping-basket'],
  Кафе: ['yellow', 'coffee'],
  Транспорт: ['cyan', 'bus'],
  Авто: ['orange', 'car'],
  Підписки: ['pink', 'repeat'],
  "Здоров'я": ['red', 'heart-pulse'],
  Фриланс: ['lime', 'laptop'],
}
const NEW_CATEGORIES = [
  {
    id: id(901),
    name: 'Розваги',
    color: 'plum',
    sort_order: 12,
  },
  {
    id: id(902),
    name: "Зв'язок",
    color: 'teal',
    sort_order: 13,
  },
]

must(
  await client.from('categories').upsert(
    NEW_CATEGORIES.map((row) => ({
      ...row,
      ledger_id: ledgerId,
      kind: 'expense',
    })),
    {
      onConflict: 'id',
      ignoreDuplicates: true,
    },
  ),
  'categories',
)

for (const [name, [color, icon]] of Object.entries(CATEGORIES)) {
  must(
    await client
      .from('categories')
      .update({
        color,
        icon,
      })
      .eq('ledger_id', ledgerId)
      .eq('name', name),
    `category ${name}`,
  )
}

const categoryId = Object.fromEntries(
  must(await client.from('categories').select('id, name, kind').eq('ledger_id', ledgerId), 'category ids')
    .filter((row) => row.kind === 'expense' || row.name === 'Фриланс')
    .map((row) => [row.name, row.id]),
)

// [day, recipient, category, amount in kopiykas]
const EXPENSES = [
  [1, 'Оренда квартири', 'Житло', 1_400_000],
  [2, 'АТБ', 'Продукти', 128_450],
  [4, 'Сільпо', 'Продукти', 96_230],
  [5, 'Netflix', 'Підписки', 34_900],
  [6, 'WOG', 'Авто', 185_000],
  [8, 'Uklon', 'Транспорт', 21_400],
  [9, 'Аптека «Подорожник»', "Здоров'я", 43_680],
  [11, 'Сільпо', 'Продукти', 142_715],
  [12, 'Spotify', 'Підписки', 19_900],
  [13, 'Книгарня «Є»', 'Розваги', 64_000],
  [15, 'Kyivstar', "Зв'язок", 25_000],
  [16, 'АТБ', 'Продукти', 87_340],
  [18, '«Львівська кава»', 'Кафе', 38_500],
  [19, 'Комунальні платежі', 'Житло', 231_060],
  [22, 'Google One', 'Підписки', 12_438],
  [24, 'Фітнес-клуб', "Здоров'я", 110_000],
  [26, 'Сільпо', 'Продукти', 110_825],
  [28, 'Планета Кіно', 'Розваги', 52_000],
  [29, 'СТО «Автомайстер»', 'Авто', 245_000],
]
const INCOMES = [
  [3, 'Оплата проєкту', 5_800_000],
  [17, 'Другий етап', 2_450_000],
]
const TRANSFER = {
  day: 14,
  eurMinor: 80_000,
  uahMinor: 3_320_000,
}
const day = (dayNo) => `2026-10-${String(dayNo).padStart(2, '0')}`

// balances of 30.10 stay those of demo-data.md: the opening balance on 01.10 is what October's movements leave out
const expensesMinor = EXPENSES.reduce((sum, [, , , minor]) => sum + minor, 0)
const incomesMinor = INCOMES.reduce((sum, [, , minor]) => sum + minor, 0)

must(
  await client
    .from('accounts')
    .update({
      opening_balance_minor: 4_621_580 - incomesMinor - TRANSFER.uahMinor + expensesMinor,
      opening_balance_on: '2026-10-01',
    })
    .eq('id', CARD),
  'card opening',
)
must(
  await client
    .from('accounts')
    .update({
      opening_balance_minor: 120_000 + TRANSFER.eurMinor,
      opening_balance_on: '2026-10-01',
    })
    .eq('id', EUR),
  'EUR opening',
)

const operation = (seq, kind, date, minor, category, counterparty) => ({
  id: id(100 + seq),
  ledger_id: ledgerId,
  kind,
  direction: kind === 'income' ? 'in' : 'out',
  account_id: CARD,
  amount_minor: minor,
  currency: 'UAH',
  occurred_at: `${date}T09:00:00Z`,
  occurred_on: date,
  category_id: categoryId[category],
  counterparty,
  note: null,
  refund_of_id: null,
  duplicated_from_id: null,
})
const operations = [
  ...INCOMES.map(([dayNo, title, minor], index) => operation(index, 'income', day(dayNo), minor, 'Фриланс', title)),
  ...EXPENSES.map(([dayNo, recipient, category, minor], index) =>
    operation(10 + index, 'expense', day(dayNo), minor, category, recipient),
  ),
]

// create_operation is idempotent on the id, so a second run changes nothing
for (const row of operations) {
  must(await client.rpc('create_operation', { p_operation: row }), `operation ${row.counterparty}`)
}

must(
  await client.rpc('create_transfer', {
    p_transfer: {
      id: id(200),
      ledger_id: ledgerId,
      from_account_id: EUR,
      to_account_id: CARD,
      from_amount_minor: TRANSFER.eurMinor,
      from_currency: 'EUR',
      to_amount_minor: TRANSFER.uahMinor,
      to_currency: 'UAH',
      fee_minor: null,
      fee_category_id: null,
      occurred_at: `${day(TRANSFER.day)}T09:00:00Z`,
      occurred_on: day(TRANSFER.day),
      note: null,
    },
  }),
  'transfer',
)

const LIMITS = {
  Продукти: 700_000,
  Житло: 1_700_000,
  Авто: 500_000,
  Транспорт: 100_000,
  "Здоров'я": 200_000,
  Розваги: 150_000,
  Кафе: 100_000,
  "Зв'язок": 30_000,
  Підписки: 70_000,
}
const month = must(
  await client
    .from('budget_months')
    .upsert(
      {
        ledger_id: ledgerId,
        month: '2026-10-01',
      },
      { onConflict: 'ledger_id,month' },
    )
    .select('id')
    .single(),
  'budget month',
)

must(
  await client.from('budget_limits').upsert(
    Object.entries(LIMITS).map(([name, limitMinor]) => ({
      ledger_id: ledgerId,
      budget_month_id: month.id,
      category_id: categoryId[name],
      limit_minor: limitMinor,
    })),
    { onConflict: 'budget_month_id,category_id' },
  ),
  'budget limits',
)

const balances = must(await client.from('account_balances').select('account_id, balance_minor'), 'balances')

console.log(`seed-visual: ${operations.length} operations, 1 transfer, ${Object.keys(LIMITS).length} limits`)
console.log(balances.map((row) => `${row.account_id.slice(-2)}=${row.balance_minor}`).join(' '))
