-- Statistics (§20, plan 7.1, 7.7) and the global search of the ⌘K palette (§2, plan 7.5). Read-only, one space per
-- call: security definer with private.assert_readable first (any member; others 42501), like calendar_entries.
-- Every amount is in the space's base currency and comes with its components and unknown_count (facts or plans
-- without a known base amount: left out of the sums, never counted as 0). Income and expense are
-- private.fact_operations: transfers, debt movements and adjustments are neither, expense = expense - refund.
-- p_created_by is the "who" filter: it narrows facts (operations.created_by); plans and limits belong to the space.
-- The forecast of future months (7.3) is calendar_entries with {"entry": "plan"}: entered obligation schedules only.

-- Income, expense and result per day / week / month / year of [p_from, p_to]. Every bucket of the period is returned,
-- an empty one with operations_count 0. result = income - expense + refund.
create function public.stats_cashflow(p_ledger_id uuid, p_from date, p_to date, p_bucket text default 'month',
  p_created_by uuid default null)
returns table (
  period_start date,
  income_minor bigint,
  expense_minor bigint,
  refund_minor bigint,
  result_minor bigint,
  unknown_count int,
  operations_count int
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform private.assert_readable(p_ledger_id);
  if p_bucket is null or p_bucket not in ('day', 'week', 'month', 'year') or p_from is null or p_to is null
    or p_from > p_to then
    raise exception 'bucket must be day, week, month or year, and from <= to' using errcode = '22023';
  end if;

  return query
  with f as (
    select date_trunc(p_bucket, o.occurred_on::timestamp)::date as period_start, o.kind, o.base_minor
    from private.fact_operations(p_ledger_id, p_from, p_to, p_created_by) o
  ),
  sums as (
    select b.day::date as period_start,
      coalesce(sum(f.base_minor) filter (where f.kind = 'income'), 0)::bigint as income_minor,
      coalesce(sum(f.base_minor) filter (where f.kind = 'expense'), 0)::bigint as expense_minor,
      coalesce(sum(f.base_minor) filter (where f.kind = 'refund'), 0)::bigint as refund_minor,
      (count(f.kind) filter (where f.base_minor is null))::int as unknown_count,
      count(f.kind)::int as operations_count
    from generate_series(date_trunc(p_bucket, p_from::timestamp), p_to::timestamp, ('1 ' || p_bucket)::interval) b (day)
    left join f on f.period_start = b.day::date
    group by b.day
  )
  select s.period_start, s.income_minor, s.expense_minor, s.refund_minor,
    s.income_minor - s.expense_minor + s.refund_minor, s.unknown_count, s.operations_count
  from sums s
  order by s.period_start;
end $$;

-- Income and expense of [p_from, p_to] by the operation's own category (a subcategory is its own row; categories
-- give parent_id for a roll-up). fact = gross - refund; the expense rows add up to stats_cashflow's expense - refund.
create function public.stats_by_category(p_ledger_id uuid, p_from date, p_to date, p_created_by uuid default null)
returns table (
  category_kind text, -- 'income' | 'expense'
  category_id uuid, -- null = without a category
  gross_minor bigint,
  refund_minor bigint,
  fact_minor bigint,
  unknown_count int,
  operations_count int
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform private.assert_readable(p_ledger_id);

  return query
  select o.category_kind, o.category_id,
    coalesce(sum(o.base_minor) filter (where o.kind <> 'refund'), 0)::bigint,
    coalesce(sum(o.base_minor) filter (where o.kind = 'refund'), 0)::bigint,
    (coalesce(sum(o.base_minor) filter (where o.kind <> 'refund'), 0)
      - coalesce(sum(o.base_minor) filter (where o.kind = 'refund'), 0))::bigint,
    (count(*) filter (where o.base_minor is null))::int,
    count(*)::int
  from private.fact_operations(p_ledger_id, p_from, p_to, p_created_by) o
  group by o.category_kind, o.category_id
  order by 1, 5 desc;
end $$;

-- Budget plan against fact for every month of [p_from, p_to] (§11, §20); the rows per category are
-- budget_month_facts of that month. limit_minor is null for a month without limits (no plan, not a plan of 0).
create function public.stats_budget(p_ledger_id uuid, p_from date, p_to date, p_created_by uuid default null)
returns table (
  month date,
  income_plan_minor bigint, -- null = no income plan
  income_fact_minor bigint,
  limit_minor bigint, -- sum of the limits
  carried_in_minor bigint, -- known remainders carried in
  limited_fact_minor bigint, -- expense fact of the limited categories
  expense_fact_minor bigint, -- expense fact of all categories
  unknown_count int -- facts without a base amount + limits with an unknown carried remainder
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform private.assert_readable(p_ledger_id);

  return query
  select m.day::date, bm.income_plan_minor,
    coalesce(sum(f.fact_minor) filter (where f.category_kind = 'income'), 0)::bigint,
    sum(f.limit_minor)::bigint,
    coalesce(sum(f.carried_in_minor), 0)::bigint,
    coalesce(sum(f.fact_minor) filter (where f.limit_id is not null), 0)::bigint,
    coalesce(sum(f.fact_minor) filter (where f.category_kind = 'expense'), 0)::bigint,
    (coalesce(sum(f.unknown_count), 0) + count(*) filter (where f.limit_id is not null and f.carried_in_minor is null))::int
  from generate_series(date_trunc('month', p_from::timestamp), p_to::timestamp, interval '1 month') m (day)
  left join public.budget_months bm on bm.ledger_id = p_ledger_id and bm.month = m.day::date
  left join lateral public.budget_month_facts(p_ledger_id, m.day::date, p_created_by) f on true
  group by m.day, bm.income_plan_minor
  order by 1;
end $$;

-- Subscriptions in [p_from, p_to] (§8, §20): fact = paid parts of their obligations by operations of the period
-- (a payment's share of its operation's base amount), plan = planned amounts of active obligations due in the period
-- (paid or not, converted on the due date), average = fact / months of the period (round half up).
create function public.stats_subscriptions(p_ledger_id uuid, p_from date, p_to date, p_created_by uuid default null)
returns table (
  subscription_id uuid,
  name text,
  status text,
  fact_minor bigint,
  fact_count int,
  plan_minor bigint,
  plan_count int,
  unknown_count int,
  months int,
  avg_month_minor bigint
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_base text;
  v_months int := (extract(year from p_to) * 12 + extract(month from p_to))::int
    - (extract(year from p_from) * 12 + extract(month from p_from))::int + 1;
begin
  perform private.assert_readable(p_ledger_id);
  select l.base_currency into v_base from public.ledgers l where l.id = p_ledger_id;

  return query
  with entries as (
    select ob.source_id, true as is_fact,
      round(op.base_amount_minor::numeric * p.operation_amount_minor / op.amount_minor)::bigint as base_minor
    from public.obligation_payments p
    join public.obligations ob on ob.ledger_id = p.ledger_id and ob.id = p.obligation_id
    join public.operations op on op.ledger_id = p.ledger_id and op.id = p.operation_id
    where p.ledger_id = p_ledger_id and ob.source_type = 'subscription' and op.occurred_on between p_from and p_to
      and (p_created_by is null or op.created_by = p_created_by)
    union all
    select ob.source_id, false,
      private.convert_minor(p_ledger_id, ob.planned_amount_minor, ob.currency, v_base, ob.due_on)
    from public.obligations ob
    where ob.ledger_id = p_ledger_id and ob.source_type = 'subscription' and ob.lifecycle = 'active'
      and ob.due_on between p_from and p_to
  )
  select s.id, s.name, s.status,
    coalesce(sum(e.base_minor) filter (where e.is_fact), 0)::bigint,
    (count(*) filter (where e.is_fact))::int,
    coalesce(sum(e.base_minor) filter (where not e.is_fact), 0)::bigint,
    (count(*) filter (where not e.is_fact))::int,
    (count(*) filter (where e.base_minor is null))::int,
    v_months,
    round(coalesce(sum(e.base_minor) filter (where e.is_fact), 0)::numeric / v_months)::bigint
  from entries e
  join public.subscriptions s on s.ledger_id = p_ledger_id and s.id = e.source_id
  group by s.id
  order by 4 desc, 2;
end $$;

-- Credit load and payoff (§9, §20) from the entered schedules: installments paid (before tracking + paid now), what
-- remains (credit currency and base currency on each due date), the next and the last due date, and what operations
-- of [p_from, p_to] paid. The purchase price is never counted: only installments are money spent.
create function public.stats_credits(p_ledger_id uuid, p_from date, p_to date, p_created_by uuid default null)
returns table (
  credit_id uuid,
  name text,
  lender text,
  status text,
  currency text,
  installments_count int,
  paid_count int,
  remaining_count int,
  remaining_minor bigint, -- credit currency, known amounts
  remaining_base_minor bigint, -- base currency, known amounts and rates
  next_due_on date,
  payoff_on date, -- due date of the last scheduled installment
  period_paid_minor bigint,
  period_paid_count int,
  unknown_count int -- unpaid installments without a base amount + period payments without one
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_base text;
begin
  perform private.assert_readable(p_ledger_id);
  select l.base_currency into v_base from public.ledgers l where l.id = p_ledger_id;

  return query
  with inst as (
    select s.source_id, s.state <> 'paid' as is_open, s.due_on, s.remaining_minor,
      private.convert_minor(p_ledger_id, s.remaining_minor, s.currency, v_base, s.due_on) as remaining_base
    from public.obligation_states s
    where s.ledger_id = p_ledger_id and s.source_type = 'credit' and s.lifecycle = 'active'
  ),
  paid as (
    select ob.source_id,
      round(op.base_amount_minor::numeric * p.operation_amount_minor / op.amount_minor)::bigint as base_minor
    from public.obligation_payments p
    join public.obligations ob on ob.ledger_id = p.ledger_id and ob.id = p.obligation_id
    join public.operations op on op.ledger_id = p.ledger_id and op.id = p.operation_id
    where p.ledger_id = p_ledger_id and ob.source_type = 'credit' and op.occurred_on between p_from and p_to
      and (p_created_by is null or op.created_by = p_created_by)
  )
  select c.id, c.name, c.lender, c.status, c.currency, c.installments_count,
    c.paid_before_tracking_count + i.paid_count, i.remaining_count, i.remaining_minor, i.remaining_base_minor,
    i.next_due_on, i.payoff_on, pd.paid_minor, pd.paid_count, i.unknown_count + pd.unknown_count
  from public.credits c
  cross join lateral (
    select (count(*) filter (where not inst.is_open))::int as paid_count,
      (count(*) filter (where inst.is_open))::int as remaining_count,
      coalesce(sum(inst.remaining_minor) filter (where inst.is_open), 0)::bigint as remaining_minor,
      coalesce(sum(inst.remaining_base) filter (where inst.is_open), 0)::bigint as remaining_base_minor,
      min(inst.due_on) filter (where inst.is_open) as next_due_on,
      max(inst.due_on) as payoff_on,
      (count(*) filter (where inst.is_open and inst.remaining_base is null))::int as unknown_count
    from inst where inst.source_id = c.id
  ) i
  cross join lateral (
    select coalesce(sum(paid.base_minor), 0)::bigint as paid_minor, count(*)::int as paid_count,
      (count(*) filter (where paid.base_minor is null))::int as unknown_count
    from paid where paid.source_id = c.id
  ) pd
  where c.ledger_id = p_ledger_id
  order by c.status = 'active' desc, i.payoff_on nulls last, c.name;
end $$;

-- Global search of the ⌘K palette (§2): operations by counterparty and note (operations_search_idx) or by amount
-- ("349" = 349.00-349.99, "349,50" exactly), accounts, categories, subscriptions, credits, debts and planned payments
-- entered by hand, by name. Sources first, then operations from the newest; at most p_limit rows (1-50). link_path
-- is the app route that shows the entity; day, amount_minor and currency are for display (null where none).
create function public.search_entities(p_ledger_id uuid, p_q text, p_limit int default 20)
returns table (
  entity_type text, -- account | category | subscription | credit | debt | obligation | operation
  entity_id uuid,
  title text,
  subtitle text,
  link_path text,
  day date,
  amount_minor bigint,
  currency text
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_q text := btrim(coalesce(p_q, ''));
  v_like text;
  v_number text := replace(replace(btrim(coalesce(p_q, '')), ' ', ''), ',', '.');
begin
  perform private.assert_readable(p_ledger_id);
  if char_length(v_q) < 2 then
    return;
  end if;
  v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  if v_number !~ '^\d{1,15}([.]\d{1,2})?$' then
    v_number := null;
  end if;

  return query
  select r.entity_type, r.entity_id, r.title, r.subtitle, r.link_path, r.day, r.amount_minor, r.currency
  from (
    select 'account' as entity_type, 1 as rank, a.id as entity_id, a.name as title, null::text as subtitle,
      '/operations/accounts/' || a.id as link_path, null::date as day, null::bigint as amount_minor, a.currency
    from public.accounts a
    where a.ledger_id = p_ledger_id and a.name ilike v_like
    union all
    select 'category', 2, c.id, c.name, c.kind, '/operations?period=all&category=' || c.id, null, null, null
    from public.categories c
    where c.ledger_id = p_ledger_id and c.name ilike v_like
    union all
    select 'subscription', 3, s.id, s.name, s.status, '/payments/subscriptions?id=' || s.id, null, null, s.currency
    from public.subscriptions s
    where s.ledger_id = p_ledger_id and (s.name ilike v_like or s.note ilike v_like)
    union all
    select 'credit', 4, c.id, c.name, c.lender, '/payments/credits/' || c.id, c.opened_on, c.total_payable_minor, c.currency
    from public.credits c
    where c.ledger_id = p_ledger_id and (c.name ilike v_like or c.lender ilike v_like or c.note ilike v_like)
    union all
    select 'debt', 5, d.id, d.person, d.reason, '/payments/debts?id=' || d.id, d.arisen_on, d.principal_minor, d.currency
    from public.debts d
    where d.ledger_id = p_ledger_id and (d.person ilike v_like or d.reason ilike v_like or d.note ilike v_like)
    union all
    select 'obligation', 6, o.id, o.title, null, '/payments?obligation=' || o.id, o.due_on, o.planned_amount_minor,
      o.currency
    from public.obligations o
    where o.ledger_id = p_ledger_id and o.source_type in ('manual', 'income_plan') and o.lifecycle = 'active'
      and o.title ilike v_like
    union all
    -- a transfer is found by its outgoing leg, as in the calendar
    select 'operation', 7, o.id, coalesce(o.counterparty, o.note, o.kind),
      case when o.counterparty is not null then o.note end,
      '/operations?period=' || to_char(o.occurred_on, 'YYYY-MM') || '&operation=' || o.id, o.occurred_on,
      o.amount_minor, o.currency
    from public.operations o
    where o.ledger_id = p_ledger_id and o.kind <> 'transfer_in'
      and ((coalesce(o.counterparty, '') || ' ' || coalesce(o.note, '')) ilike v_like
        or (v_number is not null and (o.amount_minor = round(v_number::numeric * 100)
          or (strpos(v_number, '.') = 0 and o.amount_minor / 100 = v_number::bigint))))
  ) r
  order by r.rank, r.day desc nulls last, r.title, r.entity_id
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;

revoke execute on function public.stats_cashflow(uuid, date, date, text, uuid),
  public.stats_by_category(uuid, date, date, uuid), public.stats_budget(uuid, date, date, uuid),
  public.stats_subscriptions(uuid, date, date, uuid), public.stats_credits(uuid, date, date, uuid),
  public.search_entities(uuid, text, int) from public, anon;
grant execute on function public.stats_cashflow(uuid, date, date, text, uuid),
  public.stats_by_category(uuid, date, date, uuid), public.stats_budget(uuid, date, date, uuid),
  public.stats_subscriptions(uuid, date, date, uuid), public.stats_credits(uuid, date, date, uuid),
  public.search_entities(uuid, text, int) to authenticated;
