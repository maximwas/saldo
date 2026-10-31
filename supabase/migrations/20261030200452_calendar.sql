-- Universal calendar (§18, docs/architecture.md §5.9): facts (operations) and plans (obligations) of one space in a
-- date range, and their daily totals in the space's base currency. Range and filter are parameters, never URL state,
-- so the calendar screen and the MCP server (plan 2.10) run the same query.
--
-- One entry per thing that happened or is planned:
-- * a fact is an operation on occurred_on; a transfer is one entry (its outgoing leg, matching either account), its fee
--   is an expense of its own;
-- * an operation that pays an obligation is that obligation's fact: it carries obligation_id, source and planned_on
--   (the plan's date), and a paid obligation is not listed again, so a paid plan and its payment never count twice;
-- * a plan is an obligation on due_on that is not paid: amount_minor is what remains (planned - paid; null = unknown),
--   so a partial payment (its fact) and the remainder (the plan) are shown apart.
--
-- p_filter (all keys optional, combined with AND, a list matches any of its values):
--   entry 'fact' | 'plan'; kinds [operation kind; a plan is 'expense' / 'income', a debt plan 'debt_out' / 'debt_in'];
--   direction 'in' | 'out'; states [state: 'fact' or an obligation state; default: all but cancelled and replaced];
--   source_types [obligations.source_type]; source_id (one subscription, credit, debt ...); category_ids;
--   account_ids; currencies; min_amount_minor / max_amount_minor (base currency, an unknown base never matches);
--   q (case-insensitive text in title, counterparty, note).
create function public.calendar_entries(p_ledger_id uuid, p_from date, p_to date, p_filter jsonb default '{}')
returns table (
  entry_id uuid, -- operation id of a fact, obligation id of a plan
  entry text,
  day date,
  kind text,
  direction text,
  state text,
  title text,
  note text,
  amount_minor bigint,
  currency text,
  base_amount_minor bigint, -- null = unknown amount or rate (§20)
  account_id uuid,
  category_id uuid,
  operation_id uuid,
  transfer_id uuid,
  obligation_id uuid,
  source_type text,
  source_id uuid,
  planned_on date, -- the plan's due date: a fact's planned date may differ from the day it was paid (§18)
  planned_amount_minor bigint,
  paid_minor bigint
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  f jsonb := coalesce(p_filter, '{}');
  v_base text;
begin
  -- definer reads past RLS (it converts with private.convert_minor): any member may read, nobody else
  if auth.uid() is null or p_ledger_id is null or p_ledger_id not in (select private.my_ledger_ids()) then
    raise exception 'not a member of this space' using errcode = '42501';
  end if;
  select l.base_currency into v_base from public.ledgers l where l.id = p_ledger_id;

  return query
  with facts as (
    select op.id as entry_id, 'fact'::text as entry, op.occurred_on as day, op.kind, op.direction, 'fact'::text as state,
      coalesce(op.counterparty, ob.title, op.note) as title, op.note, op.amount_minor, op.currency,
      op.base_amount_minor, op.account_id, op.category_id, op.id as operation_id, op.transfer_id,
      ob.id as obligation_id, ob.source_type, ob.source_id, ob.due_on as planned_on, ob.planned_amount_minor,
      null::bigint as paid_minor,
      array[op.account_id, leg_in.account_id] as accounts,
      concat_ws(' ', op.counterparty, op.note, ob.title) as search
    from public.operations op
    left join public.operations leg_in
      on op.kind = 'transfer_out' and leg_in.ledger_id = op.ledger_id and leg_in.transfer_id = op.transfer_id
        and leg_in.kind = 'transfer_in'
    left join lateral (
      select o.id, o.title, o.source_type, o.source_id, o.due_on, o.planned_amount_minor
      from public.obligation_payments p
      join public.obligations o on o.id = p.obligation_id
      where p.ledger_id = op.ledger_id and p.operation_id in (op.id, leg_in.id)
      order by p.created_at, p.id
      limit 1
    ) ob on true
    where op.ledger_id = p_ledger_id and op.occurred_on between p_from and p_to and op.kind <> 'transfer_in'
  ),
  plans as (
    select s.obligation_id as entry_id, 'plan'::text as entry, s.due_on as day,
      case when s.source_type = 'debt' then 'debt_' || s.direction when s.direction = 'in' then 'income' else 'expense' end,
      s.direction, s.state, s.title, null::text as note, s.remaining_minor, s.currency,
      private.convert_minor(p_ledger_id, s.remaining_minor, s.currency, v_base, s.due_on), s.account_id, s.category_id,
      null::uuid, null::uuid, s.obligation_id, s.source_type, s.source_id, s.due_on, s.planned_amount_minor, s.paid_minor,
      array[s.account_id], s.title
    from public.obligation_states s
    where s.ledger_id = p_ledger_id and s.due_on between p_from and p_to
      -- a paid plan is shown by its payment; one paid with no operation (none yet: tax withholdings) stays a plan
      and not (s.state = 'paid' and exists (select 1 from public.obligation_payments p where p.obligation_id = s.obligation_id))
  ),
  entries as (select * from facts union all select * from plans)
  select e.entry_id, e.entry, e.day, e.kind, e.direction, e.state, e.title, e.note, e.amount_minor, e.currency,
    e.base_amount_minor, e.account_id, e.category_id, e.operation_id, e.transfer_id, e.obligation_id, e.source_type,
    e.source_id, e.planned_on, e.planned_amount_minor, e.paid_minor
  from entries e
  where (f ->> 'entry' is null or e.entry = f ->> 'entry')
    and (f -> 'kinds' is null or e.kind = any (array(select jsonb_array_elements_text(f -> 'kinds'))))
    and (f ->> 'direction' is null or e.direction = f ->> 'direction')
    and (case when f ? 'states' then e.state = any (array(select jsonb_array_elements_text(f -> 'states')))
      else e.state not in ('cancelled', 'replaced') end)
    and (f -> 'source_types' is null
      or e.source_type = any (array(select jsonb_array_elements_text(f -> 'source_types'))))
    and (f ->> 'source_id' is null or e.source_id = (f ->> 'source_id')::uuid)
    and (f -> 'category_ids' is null
      or e.category_id = any (array(select jsonb_array_elements_text(f -> 'category_ids')::uuid)))
    and (f -> 'account_ids' is null
      or e.accounts && array(select jsonb_array_elements_text(f -> 'account_ids')::uuid))
    and (f -> 'currencies' is null or e.currency = any (array(select jsonb_array_elements_text(f -> 'currencies'))))
    and (f ->> 'min_amount_minor' is null or e.base_amount_minor >= (f ->> 'min_amount_minor')::bigint)
    and (f ->> 'max_amount_minor' is null or e.base_amount_minor <= (f ->> 'max_amount_minor')::bigint)
    and (coalesce(f ->> 'q', '') = '' or strpos(lower(e.search), lower(f ->> 'q')) > 0)
  order by e.day, e.entry, e.entry_id;
end $$;

-- Daily totals of exactly the entries calendar_entries returns for the same filter (§18: filters change the totals),
-- in the base currency. Fact income = income; fact expense = expense - refund; transfers, debt movements and
-- adjustments are neither (§10, §20) but count as entries. Plan in/out = what remains of the plans by direction.
-- Sums cover known amounts; unknown_count says how many income/expense/plan entries have no base amount (null ≠ 0).
-- Days without entries are not returned; the period total is the sum of the days.
create function public.calendar_day_totals(p_ledger_id uuid, p_from date, p_to date, p_filter jsonb default '{}')
returns table (
  day date,
  fact_income_minor bigint,
  fact_expense_minor bigint,
  plan_in_minor bigint,
  plan_out_minor bigint,
  unknown_count int,
  entries_count int
)
language sql stable set search_path = '' as $$
  select e.day,
    coalesce(sum(e.base_amount_minor) filter (where e.entry = 'fact' and e.kind = 'income'), 0)::bigint,
    coalesce(sum(case e.kind when 'expense' then e.base_amount_minor else -e.base_amount_minor end)
      filter (where e.entry = 'fact' and e.kind in ('expense', 'refund')), 0)::bigint,
    coalesce(sum(e.base_amount_minor) filter (where e.entry = 'plan' and e.direction = 'in'), 0)::bigint,
    coalesce(sum(e.base_amount_minor) filter (where e.entry = 'plan' and e.direction = 'out'), 0)::bigint,
    (count(*) filter (where e.base_amount_minor is null
      and (e.entry = 'plan' or e.kind in ('income', 'expense', 'refund'))))::int,
    count(*)::int
  from public.calendar_entries(p_ledger_id, p_from, p_to, p_filter) e
  group by e.day
  order by e.day
$$;

revoke execute on function public.calendar_entries(uuid, date, date, jsonb),
  public.calendar_day_totals(uuid, date, date, jsonb) from public, anon;
grant execute on function public.calendar_entries(uuid, date, date, jsonb),
  public.calendar_day_totals(uuid, date, date, jsonb) to authenticated;
