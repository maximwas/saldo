-- Planned payments (docs/architecture.md §5.3): obligations, obligation_payments, view obligation_states.
-- envelope_id (reserves) and withholding_id (tax_withholdings) come with their tables in later phases.

create table public.obligations (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  -- in = expected income (a debt owed to me, planned income); never added to available money (§3)
  direction text not null default 'out' constraint obligations_direction_check check (direction in ('out', 'in')),
  source_type text not null default 'manual' constraint obligations_source_type_check
    check (source_type in ('subscription', 'credit', 'debt', 'big_expense', 'auto_plan', 'tax', 'income_plan', 'manual')),
  source_id uuid, -- polymorphic, no FK: sources with payments are archived, never deleted
  title text not null, -- for display only, never a key (§4, §19)
  occurrence_on date not null, -- nominal series date, kept when the payment is moved
  due_on date not null,
  sequence_no int,
  planned_amount_minor bigint, -- null = amount unknown (§7), never 0
  currency text not null constraint obligations_currency_check check (currency in ('UAH', 'USD', 'EUR')),
  account_id uuid,
  category_id uuid,
  lifecycle text not null default 'active' constraint obligations_lifecycle_check
    check (lifecycle in ('active', 'cancelled', 'replaced')),
  replaced_by_id uuid,
  settled_at timestamptz,
  settled_by uuid references auth.users on delete set null,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- the RPCs that add or remove a payment bump it too, so a second person paying from a stale screen gets PT409
  -- instead of a double payment (ADR 21); not a trigger: it would run inside a space-deletion cascade
  version int not null default 1,
  constraint obligations_ledger_id_id_key unique (ledger_id, id),
  constraint obligations_source_required check (source_type = 'manual' or source_id is not null),
  constraint obligations_amount_positive check (planned_amount_minor is null or planned_amount_minor > 0),
  constraint obligations_occurrence_unique unique (ledger_id, source_type, source_id, occurrence_on),
  constraint obligations_account_fkey foreign key (ledger_id, account_id) references public.accounts (ledger_id, id),
  constraint obligations_category_fkey foreign key (ledger_id, category_id) references public.categories (ledger_id, id),
  constraint obligations_replaced_by_fkey foreign key (ledger_id, replaced_by_id)
    references public.obligations (ledger_id, id) on delete set null (replaced_by_id)
);
create index obligations_ledger_id_due_on_idx on public.obligations (ledger_id, due_on) where lifecycle = 'active';
create index obligations_ledger_id_account_id_idx on public.obligations (ledger_id, account_id) where account_id is not null;
create index obligations_ledger_id_category_id_idx on public.obligations (ledger_id, category_id) where category_id is not null;
create index obligations_ledger_id_replaced_by_id_idx on public.obligations (ledger_id, replaced_by_id)
  where replaced_by_id is not null;
create index obligations_settled_by_idx on public.obligations (settled_by);
create index obligations_created_by_idx on public.obligations (created_by);

create table public.obligation_payments (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  obligation_id uuid not null,
  operation_id uuid not null,
  amount_minor bigint not null constraint obligation_payments_amount_positive check (amount_minor > 0), -- obligation currency
  created_by uuid default auth.uid() references auth.users on delete set null, -- who confirmed the payment
  created_at timestamptz not null default now(),
  constraint obligation_payments_operation_unique unique (obligation_id, operation_id),
  -- no action, not restrict: a space deletion cascades to obligations and payments in one statement
  constraint obligation_payments_obligation_fkey foreign key (ledger_id, obligation_id)
    references public.obligations (ledger_id, id),
  -- deleting the operation removes the payment and the obligation goes back to plan (§4, §24)
  constraint obligation_payments_operation_fkey foreign key (ledger_id, operation_id)
    references public.operations (ledger_id, id) on delete cascade
);
create index obligation_payments_ledger_id_obligation_id_idx on public.obligation_payments (ledger_id, obligation_id);
create index obligation_payments_ledger_id_operation_id_idx on public.obligation_payments (ledger_id, operation_id);
create index obligation_payments_created_by_idx on public.obligation_payments (created_by);

create trigger obligations_bump_version before update on public.obligations
  for each row execute function private.bump_version();
create trigger obligations_keep_created_by before update on public.obligations
  for each row execute function private.keep_created_by();

-- State is derived, never stored (§7, §9). «Today» is the date in the space's time zone.
create view public.obligation_states with (security_invoker = true) as
select
  o.id as obligation_id,
  o.ledger_id,
  o.direction,
  o.source_type,
  o.source_id,
  o.title,
  o.occurrence_on,
  o.due_on,
  o.sequence_no,
  o.planned_amount_minor,
  o.currency,
  o.account_id,
  o.category_id,
  o.lifecycle,
  o.settled_at,
  o.settled_by,
  o.version,
  p.paid_minor,
  case when o.planned_amount_minor is not null then greatest(o.planned_amount_minor - p.paid_minor, 0) end as remaining_minor,
  case when o.planned_amount_minor is not null then greatest(p.paid_minor - o.planned_amount_minor, 0) end as overpaid_minor,
  case
    when o.lifecycle <> 'active' then o.lifecycle
    when o.settled_at is not null or p.paid_minor >= o.planned_amount_minor then 'paid'
    when p.paid_minor > 0 then 'partial'
    when o.due_on < (now() at time zone l.time_zone)::date then 'unconfirmed'
    else 'plan'
  end as state
from public.obligations o
join public.ledgers l on l.id = o.ledger_id
cross join lateral (
  select coalesce(sum(op.amount_minor), 0)::bigint as paid_minor
  from public.obligation_payments op
  where op.ledger_id = o.ledger_id and op.obligation_id = o.id
) p;

alter table public.obligations enable row level security;
alter table public.obligation_payments enable row level security;

create policy obligations_read on public.obligations for select to authenticated using (ledger_id in (select private.my_ledger_ids()));
create policy obligations_write on public.obligations for all to authenticated
  using (ledger_id in (select private.my_writable_ledger_ids())) with check (ledger_id in (select private.my_writable_ledger_ids()));
create policy obligation_payments_read on public.obligation_payments for select to authenticated
  using (ledger_id in (select private.my_ledger_ids()));
create policy obligation_payments_write on public.obligation_payments for all to authenticated
  using (ledger_id in (select private.my_writable_ledger_ids())) with check (ledger_id in (select private.my_writable_ledger_ids()));

revoke all on table public.obligations, public.obligation_payments, public.obligation_states from anon, authenticated;
grant select, insert, update, delete on table public.obligations to authenticated;
grant select, insert, delete on table public.obligation_payments to authenticated;
grant select on table public.obligation_states to authenticated;
