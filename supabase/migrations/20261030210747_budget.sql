-- Monthly budget of phase 4 (docs/architecture.md §5.5, spec §11): an income plan and expense limits per category, in
-- the space's base currency. A budget never changes a balance; its facts are operations (budget_month_facts).
-- Months and limits are single-row writes under RLS (owner and editor, versioned updates); copy_budget_month writes
-- both tables, so it is an RPC.

create table public.budget_months (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  month date not null constraint budget_months_month_first_day check (extract(day from month) = 1),
  income_plan_minor bigint -- null = no income plan
    constraint budget_months_income_plan_check check (income_plan_minor is null or income_plan_minor >= 0),
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint budget_months_ledger_id_id_key unique (ledger_id, id),
  constraint budget_months_ledger_id_month_key unique (ledger_id, month)
);
create index budget_months_created_by_idx on public.budget_months (created_by);

create table public.budget_limits (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  budget_month_id uuid not null,
  category_id uuid not null,
  -- limits are for expense categories only; the income plan is one number per month
  category_kind text generated always as ('expense') stored,
  limit_minor bigint not null constraint budget_limits_limit_check check (limit_minor >= 0),
  -- warn when the fact reaches this share of the limit; null = no warning
  warn_at_pct smallint default 80 constraint budget_limits_warn_at_pct_check check (warn_at_pct between 1 and 100),
  -- what copy_budget_month does with this month's remainder: carry it into the next limit or start from zero (§11)
  carry_mode text not null default 'reset' constraint budget_limits_carry_mode_check check (carry_mode in ('carry', 'reset')),
  -- remainder carried in by copy_budget_month; null = unknown (the source month had facts without a rate), never 0
  carried_in_minor bigint default 0,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint budget_limits_category_unique unique (budget_month_id, category_id),
  constraint budget_limits_month_fkey foreign key (ledger_id, budget_month_id)
    references public.budget_months (ledger_id, id) on delete cascade,
  constraint budget_limits_category_fkey foreign key (ledger_id, category_id, category_kind)
    references public.categories (ledger_id, id, kind) on delete cascade
);
create index budget_limits_ledger_id_category_id_idx on public.budget_limits (ledger_id, category_id);
create index budget_limits_created_by_idx on public.budget_limits (created_by);

create trigger budget_months_bump_version before update on public.budget_months
  for each row execute function private.bump_version();
create trigger budget_limits_bump_version before update on public.budget_limits
  for each row execute function private.bump_version();
create trigger budget_months_keep_created_by before update on public.budget_months
  for each row execute function private.keep_created_by();
create trigger budget_limits_keep_created_by before update on public.budget_limits
  for each row execute function private.keep_created_by();

alter table public.budget_months enable row level security;
alter table public.budget_limits enable row level security;

create policy budget_months_read on public.budget_months for select to authenticated
  using (ledger_id in (select private.my_ledger_ids()));
create policy budget_months_write on public.budget_months for all to authenticated
  using (ledger_id in (select private.my_writable_ledger_ids())) with check (ledger_id in (select private.my_writable_ledger_ids()));
create policy budget_limits_read on public.budget_limits for select to authenticated
  using (ledger_id in (select private.my_ledger_ids()));
create policy budget_limits_write on public.budget_limits for all to authenticated
  using (ledger_id in (select private.my_writable_ledger_ids())) with check (ledger_id in (select private.my_writable_ledger_ids()));

revoke all on table public.budget_months, public.budget_limits from anon, authenticated;
grant select, insert, update, delete on table public.budget_months, public.budget_limits to authenticated;

-- 42501 unless the caller is signed in and a member (any role) of the space. Read functions are security definer
-- (they convert with private.convert_minor and read past RLS), so each calls this before reading anything.
create function private.assert_readable(p_ledger_id uuid) returns void
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null or p_ledger_id is null or p_ledger_id not in (select private.my_ledger_ids()) then
    raise exception 'not a member of this space' using errcode = '42501';
  end if;
end $$;

-- What counts as income and expense (§10, §20), the one rule every budget and statistics function reads: income,
-- expense (a transfer fee included) and refund operations; a refund is a negative expense. Transfers, debt movements
-- and adjustments are neither; a credit's purchase price is never an operation, its paid installments are expenses.
-- p_created_by = the "who" filter (§20, plan 7.7), null = everybody. base_minor null = rate unknown (§20).
create function private.fact_operations(p_ledger_id uuid, p_from date, p_to date, p_created_by uuid default null)
returns table (id uuid, occurred_on date, kind text, category_kind text, category_id uuid, parent_id uuid,
  base_minor bigint)
language sql stable set search_path = '' as $$
  select o.id, o.occurred_on, o.kind, o.category_kind, o.category_id, c.parent_id, o.base_amount_minor
  from public.operations o
  left join public.categories c on c.ledger_id = o.ledger_id and c.id = o.category_id
  where o.ledger_id = p_ledger_id and o.occurred_on between p_from and p_to
    and o.kind in ('income', 'expense', 'refund')
    and (p_created_by is null or o.created_by = p_created_by)
$$;

revoke execute on function private.assert_readable(uuid), private.fact_operations(uuid, date, date, uuid) from public;

-- Budget of one month by category, in the base currency (§11). An expense counts once, in the closest limited
-- category: its own when it has a limit this month, else its parent's, else its own (a row without a limit). Income
-- rows carry the fact only (the plan is budget_months.income_plan_minor). Sums cover known base amounts; unknown_count
-- says how many facts have none (null ≠ 0). Obligations of the month are the calendar's plans (calendar_entries).
create function public.budget_month_facts(p_ledger_id uuid, p_month date, p_created_by uuid default null)
returns table (
  category_kind text, -- 'income' | 'expense'
  category_id uuid, -- null = operations without a category
  limit_id uuid, -- null = no limit this month
  limit_minor bigint,
  carried_in_minor bigint, -- null = unknown remainder carried in
  warn_at_pct smallint,
  carry_mode text,
  gross_minor bigint, -- incomes, or expenses before refunds
  refund_minor bigint,
  fact_minor bigint, -- gross - refund
  unknown_count int,
  operations_count int,
  remaining_minor bigint -- limit + carried_in - fact; negative = overspent; null without a limit or with an unknown carry
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_month date := date_trunc('month', p_month::timestamp)::date;
begin
  perform private.assert_readable(p_ledger_id);

  return query
  with lim as (
    select l.id, l.category_kind, l.category_id, l.limit_minor, l.carried_in_minor, l.warn_at_pct, l.carry_mode
    from public.budget_limits l
    join public.budget_months m on m.ledger_id = l.ledger_id and m.id = l.budget_month_id
    where m.ledger_id = p_ledger_id and m.month = v_month
  ),
  facts as (
    select f.category_kind, f.budget_category_id as category_id,
      coalesce(sum(f.base_minor) filter (where f.kind <> 'refund'), 0)::bigint as gross_minor,
      coalesce(sum(f.base_minor) filter (where f.kind = 'refund'), 0)::bigint as refund_minor,
      (count(*) filter (where f.base_minor is null))::int as unknown_count,
      count(*)::int as operations_count
    from (
      select o.category_kind, o.kind, o.base_minor,
        coalesce((select lim.category_id from lim where lim.category_id in (o.category_id, o.parent_id)
          order by lim.category_id = o.category_id desc limit 1), o.category_id) as budget_category_id
      from private.fact_operations(p_ledger_id, v_month, (v_month + interval '1 month - 1 day')::date, p_created_by) o
    ) f
    group by f.category_kind, f.budget_category_id
  )
  select coalesce(facts.category_kind, 'expense'), coalesce(lim.category_id, facts.category_id), lim.id,
    lim.limit_minor, lim.carried_in_minor, lim.warn_at_pct, lim.carry_mode,
    coalesce(facts.gross_minor, 0), coalesce(facts.refund_minor, 0),
    coalesce(facts.gross_minor - facts.refund_minor, 0), coalesce(facts.unknown_count, 0),
    coalesce(facts.operations_count, 0),
    lim.limit_minor + lim.carried_in_minor - coalesce(facts.gross_minor - facts.refund_minor, 0)
  from lim
  full join facts on facts.category_kind = lim.category_kind and facts.category_id = lim.category_id
  order by 1, 2;
end $$;

-- Copies the limits of p_from's month into p_to's month (§11), creating that month with the same income plan when it
-- has no budget yet. A limit the target month already has is kept, so a repeated call writes nothing. carry_mode
-- 'carry' brings the source month's remainder (limit + carried_in - fact, never below 0: an overspend is not carried)
-- into carried_in_minor; with unknown facts the remainder is unknown (null); 'reset' starts from 0.
-- Returns how many limits were written.
create function public.copy_budget_month(p_ledger_id uuid, p_from date, p_to date) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_from date := date_trunc('month', p_from::timestamp)::date;
  v_to date := date_trunc('month', p_to::timestamp)::date;
  v_source public.budget_months;
  v_target_id uuid;
  v_count int;
begin
  perform private.assert_writable(p_ledger_id);
  if v_from is null or v_to is null or v_from = v_to then
    raise exception 'copy needs two different months' using errcode = '22023';
  end if;
  select * into v_source from public.budget_months m where m.ledger_id = p_ledger_id and m.month = v_from;
  if not found then
    raise exception 'no budget for this month' using errcode = 'P0002';
  end if;

  insert into public.budget_months (ledger_id, month, income_plan_minor)
  values (p_ledger_id, v_to, v_source.income_plan_minor)
  on conflict (ledger_id, month) do nothing;
  select m.id into v_target_id from public.budget_months m where m.ledger_id = p_ledger_id and m.month = v_to;

  insert into public.budget_limits (ledger_id, budget_month_id, category_id, limit_minor, warn_at_pct, carry_mode,
    carried_in_minor)
  select p_ledger_id, v_target_id, l.category_id, l.limit_minor, l.warn_at_pct, l.carry_mode,
    case when l.carry_mode = 'reset' then 0
      when f.unknown_count > 0 or f.remaining_minor is null then null
      else greatest(f.remaining_minor, 0) end
  from public.budget_limits l
  join public.budget_month_facts(p_ledger_id, v_from) f on f.limit_id = l.id
  where l.ledger_id = p_ledger_id and l.budget_month_id = v_source.id
  on conflict (budget_month_id, category_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke execute on function public.budget_month_facts(uuid, date, uuid), public.copy_budget_month(uuid, date, date)
  from public, anon;
grant execute on function public.budget_month_facts(uuid, date, uuid), public.copy_budget_month(uuid, date, date)
  to authenticated;
