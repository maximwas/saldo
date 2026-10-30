-- Sources of planned payments of phase 2 (docs/architecture.md §5.4, §5.8): subscriptions with their price history,
-- credits, personal debts with their movements, saved calendar filters. Shared rules as in money_core.sql: ledger_id
-- cascades with the space, children reference parents by composite FKs (no row points into another space), created_by
-- is audit only. A series obligation carries its source in obligations.source_type + source_id (polymorphic, no FK):
-- sources are cancelled or archived, never deleted, so clients get no delete grant on them.

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  name text not null,
  category_id uuid,
  -- a subscription is an expense: it takes an expense category (as obligations.category_kind)
  category_kind text generated always as ('expense') stored,
  account_id uuid,
  currency text not null constraint subscriptions_currency_check check (currency in ('UAH', 'USD', 'EUR')),
  interval_unit text not null default 'month' constraint subscriptions_interval_unit_check
    check (interval_unit in ('day', 'month', 'year')),
  interval_count int not null default 1 constraint subscriptions_interval_count_positive check (interval_count > 0),
  first_on date not null,
  -- what a 29th-31st date does in a shorter month; the client applies it when it computes the dates (§8, plan 2.1)
  short_month_rule text not null default 'last_day' constraint subscriptions_short_month_rule_check
    check (short_month_rule in ('last_day', 'next_month_first', 'skip')),
  trial_ends_on date,
  -- intent, confirmed cancellation, end of access and removal from tracking (archived_at) are different things (§8)
  status text not null default 'active' constraint subscriptions_status_check
    check (status in ('trial', 'active', 'paused', 'cancel_intended', 'cancelled')),
  access_ends_on date,
  cancelled_on date,
  auto_renew_info boolean, -- information only, never acted on
  service_url text,
  note text,
  verdict text constraint subscriptions_verdict_check check (verdict in ('keep', 'review', 'cancel')),
  logo_key text,
  archived_at timestamptz,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint subscriptions_ledger_id_id_key unique (ledger_id, id),
  constraint subscriptions_account_fkey foreign key (ledger_id, account_id) references public.accounts (ledger_id, id),
  constraint subscriptions_category_fkey foreign key (ledger_id, category_id, category_kind)
    references public.categories (ledger_id, id, kind)
);
create index subscriptions_ledger_id_status_idx on public.subscriptions (ledger_id, status) where archived_at is null;
create index subscriptions_ledger_id_account_id_idx on public.subscriptions (ledger_id, account_id) where account_id is not null;
create index subscriptions_ledger_id_category_id_idx on public.subscriptions (ledger_id, category_id)
  where category_id is not null;
create index subscriptions_created_by_idx on public.subscriptions (created_by);

-- A new price changes the plan from its date only (§8): rows are written by set_subscription_price, which re-prices
-- the unpaid obligations from effective_on and never a paid one or an earlier date
create table public.subscription_prices (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  subscription_id uuid not null,
  effective_on date not null,
  -- null = unknown (§7), never 0
  amount_minor bigint constraint subscription_prices_amount_positive check (amount_minor is null or amount_minor > 0),
  currency text not null constraint subscription_prices_currency_check check (currency in ('UAH', 'USD', 'EUR')),
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  constraint subscription_prices_effective_unique unique (subscription_id, effective_on),
  constraint subscription_prices_subscription_fkey foreign key (ledger_id, subscription_id)
    references public.subscriptions (ledger_id, id) on delete cascade
);
create index subscription_prices_ledger_id_subscription_id_idx on public.subscription_prices (ledger_id, subscription_id);
create index subscription_prices_created_by_idx on public.subscription_prices (created_by);

-- Installments are obligations with source_type 'credit' and sequence_no. The purchase price is never an expense (§9):
-- no RPC turns it into an operation, only installment payments are expenses. paid_before_tracking_* records the
-- installments paid before the credit was tracked, with unknown dates, and creates no operation (§25).
create table public.credits (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  name text not null,
  lender text,
  purchase_price_minor bigint
    constraint credits_purchase_price_positive check (purchase_price_minor is null or purchase_price_minor > 0),
  total_payable_minor bigint
    constraint credits_total_payable_positive check (total_payable_minor is null or total_payable_minor > 0),
  currency text not null constraint credits_currency_check check (currency in ('UAH', 'USD', 'EUR')),
  opened_on date,
  installments_count int not null constraint credits_installments_count_positive check (installments_count > 0),
  regular_installment_minor bigint
    constraint credits_regular_installment_positive check (regular_installment_minor is null or regular_installment_minor > 0),
  last_installment_minor bigint
    constraint credits_last_installment_positive check (last_installment_minor is null or last_installment_minor > 0),
  account_id uuid,
  fees_note text,
  -- equal parts of a rounded total are an estimate, not the bank's schedule (§9)
  schedule_accuracy text not null default 'estimated' constraint credits_schedule_accuracy_check
    check (schedule_accuracy in ('bank_confirmed', 'estimated')),
  paid_before_tracking_count int not null default 0 constraint credits_paid_before_tracking_count_check
    check (paid_before_tracking_count >= 0 and paid_before_tracking_count <= installments_count),
  paid_before_tracking_minor bigint constraint credits_paid_before_tracking_minor_check
    check (paid_before_tracking_minor is null or paid_before_tracking_minor >= 0),
  status text not null default 'active' constraint credits_status_check check (status in ('active', 'closed', 'cancelled')),
  note text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint credits_ledger_id_id_key unique (ledger_id, id),
  constraint credits_account_fkey foreign key (ledger_id, account_id) references public.accounts (ledger_id, id)
);
create index credits_ledger_id_status_idx on public.credits (ledger_id, status);
create index credits_ledger_id_account_id_idx on public.credits (ledger_id, account_id) where account_id is not null;
create index credits_created_by_idx on public.credits (created_by);

-- A loan moves money (debt_out / debt_in operations change the balance) but is never income or expense (§10).
-- A debt with a due date has one active obligation (source_type 'debt') for what is still owed.
create table public.debts (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  direction text not null constraint debts_direction_check check (direction in ('owed_to_me', 'i_owe')),
  person text not null,
  reason text,
  principal_minor bigint not null constraint debts_principal_positive check (principal_minor > 0),
  currency text not null constraint debts_currency_check check (currency in ('UAH', 'USD', 'EUR')),
  arisen_on date not null,
  account_id uuid,
  due_on date,
  -- new_movement: money moves now (an operation); existing_no_movement: an old debt, no second movement;
  -- purchase_share: part of a purchase already recorded as an expense (own share = expense - share, §10)
  origin text not null default 'new_movement' constraint debts_origin_check
    check (origin in ('new_movement', 'existing_no_movement', 'purchase_share')),
  share_of_operation_id uuid,
  status text not null default 'open' constraint debts_status_check check (status in ('open', 'settled', 'written_off')),
  note text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint debts_ledger_id_id_key unique (ledger_id, id),
  -- save_debt requires the purchase for a purchase share; a deleted purchase leaves the debt without the link
  constraint debts_share_origin check (share_of_operation_id is null or origin = 'purchase_share'),
  constraint debts_account_fkey foreign key (ledger_id, account_id) references public.accounts (ledger_id, id),
  constraint debts_share_of_operation_fkey foreign key (ledger_id, share_of_operation_id)
    references public.operations (ledger_id, id) on delete set null (share_of_operation_id)
);
create index debts_ledger_id_status_idx on public.debts (ledger_id, status);
create index debts_ledger_id_account_id_idx on public.debts (ledger_id, account_id) where account_id is not null;
create index debts_ledger_id_share_of_operation_id_idx on public.debts (ledger_id, share_of_operation_id)
  where share_of_operation_id is not null;
create index debts_created_by_idx on public.debts (created_by);

-- One 'principal' row per debt (save_debt; it links the lending operation, if any) and the repayments
-- (add_debt_movement). Owed = debts.principal_minor - repayments (debtBalance in features/debts/utils). Amounts are in
-- the debt currency; an operation, when there is one, is in it too. Deleting the operation removes the movement.
create table public.debt_movements (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  debt_id uuid not null,
  kind text not null constraint debt_movements_kind_check check (kind in ('principal', 'repayment')),
  operation_id uuid, -- null: an old debt, or a repayment recorded without money moving now
  amount_minor bigint not null constraint debt_movements_amount_positive check (amount_minor > 0),
  occurred_on date not null,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  constraint debt_movements_operation_unique unique (operation_id),
  constraint debt_movements_debt_fkey foreign key (ledger_id, debt_id) references public.debts (ledger_id, id) on delete cascade,
  constraint debt_movements_operation_fkey foreign key (ledger_id, operation_id)
    references public.operations (ledger_id, id) on delete cascade
);
create index debt_movements_ledger_id_debt_id_idx on public.debt_movements (ledger_id, debt_id);
create index debt_movements_created_by_idx on public.debt_movements (created_by);

-- Own filter sets of the calendar (§18): the same object calendar_entries takes as p_filter
create table public.calendar_saved_filters (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  name text not null,
  filter jsonb not null default '{}'
    constraint calendar_saved_filters_filter_object check (jsonb_typeof(filter) = 'object'),
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1
);
create index calendar_saved_filters_ledger_id_idx on public.calendar_saved_filters (ledger_id);
create index calendar_saved_filters_created_by_idx on public.calendar_saved_filters (created_by);

-- One active obligation per series date: a replaced installment or a cancelled date keeps its row as history and the
-- new schedule takes the same date (replace_credit_schedule, upsert_series_obligations with p_from)
alter table public.obligations drop constraint obligations_occurrence_unique;
create unique index obligations_occurrence_unique on public.obligations (ledger_id, source_type, source_id, occurrence_on)
  where lifecycle = 'active';
create index obligations_ledger_id_source_idx on public.obligations (ledger_id, source_type, source_id)
  where source_id is not null;

-- A debt's obligation is paid only together with a repayment movement (add_debt_movement): paying it by
-- pay_obligation with an income or expense would count the loan as income/expense and leave the debt unchanged
create function private.check_debt_payment() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.obligations o
    where o.id = new.obligation_id and o.source_type = 'debt'
      and not exists (select 1 from public.debt_movements m
        where m.debt_id = o.source_id and m.operation_id = new.operation_id and m.kind = 'repayment')
  ) then
    raise exception 'a debt is repaid by add_debt_movement' using errcode = '22023';
  end if;
  return new;
end $$;
revoke execute on function private.check_debt_payment() from public;
create trigger obligation_payments_debt_repayment before insert on public.obligation_payments
  for each row execute function private.check_debt_payment();

create trigger subscriptions_bump_version before update on public.subscriptions
  for each row execute function private.bump_version();
create trigger credits_bump_version before update on public.credits for each row execute function private.bump_version();
create trigger debts_bump_version before update on public.debts for each row execute function private.bump_version();
create trigger calendar_saved_filters_bump_version before update on public.calendar_saved_filters
  for each row execute function private.bump_version();
create trigger subscriptions_keep_created_by before update on public.subscriptions
  for each row execute function private.keep_created_by();
create trigger subscription_prices_keep_created_by before update on public.subscription_prices
  for each row execute function private.keep_created_by();
create trigger credits_keep_created_by before update on public.credits for each row execute function private.keep_created_by();
create trigger debts_keep_created_by before update on public.debts for each row execute function private.keep_created_by();
create trigger calendar_saved_filters_keep_created_by before update on public.calendar_saved_filters
  for each row execute function private.keep_created_by();

alter table public.subscriptions enable row level security;
alter table public.subscription_prices enable row level security;
alter table public.credits enable row level security;
alter table public.debts enable row level security;
alter table public.debt_movements enable row level security;
alter table public.calendar_saved_filters enable row level security;

create policy subscriptions_read on public.subscriptions for select to authenticated
  using (ledger_id in (select private.my_ledger_ids()));
create policy subscriptions_write on public.subscriptions for all to authenticated
  using (ledger_id in (select private.my_writable_ledger_ids())) with check (ledger_id in (select private.my_writable_ledger_ids()));
create policy subscription_prices_read on public.subscription_prices for select to authenticated
  using (ledger_id in (select private.my_ledger_ids()));
create policy credits_read on public.credits for select to authenticated using (ledger_id in (select private.my_ledger_ids()));
create policy debts_read on public.debts for select to authenticated using (ledger_id in (select private.my_ledger_ids()));
create policy debt_movements_read on public.debt_movements for select to authenticated
  using (ledger_id in (select private.my_ledger_ids()));
create policy calendar_saved_filters_read on public.calendar_saved_filters for select to authenticated
  using (ledger_id in (select private.my_ledger_ids()));
create policy calendar_saved_filters_write on public.calendar_saved_filters for all to authenticated
  using (ledger_id in (select private.my_writable_ledger_ids())) with check (ledger_id in (select private.my_writable_ledger_ids()));

revoke all on table public.subscriptions, public.subscription_prices, public.credits, public.debts, public.debt_movements,
  public.calendar_saved_filters from anon, authenticated;
-- settings of a subscription are plain row edits (versioned update under RLS); removal from tracking is archived_at
grant select, insert, update on table public.subscriptions to authenticated;
-- prices, credits and debts change obligations and operations too: only through the RPCs of series_rpc.sql
grant select on table public.subscription_prices, public.credits, public.debts, public.debt_movements to authenticated;
grant select, insert, update, delete on table public.calendar_saved_filters to authenticated;
