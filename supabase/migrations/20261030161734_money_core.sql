-- Money core of phase 1 (docs/architecture.md §5.1, §5.2): accounts, categories, fx_rates, transfers, operations,
-- attachments, the attachments bucket and view account_balances. Shared rules (§5, docs/conventions.md §0):
-- ledger_id cascades with the space (ADR 27), children reference parents by composite FKs so a row never points
-- into another space, created_by is audit only and becomes null when its author's account is deleted (ADR 27:
-- the author may have been an editor of a space that stays).

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  name text not null,
  kind text not null constraint accounts_kind_check check (kind in ('bank', 'cash', 'savings')),
  currency text not null constraint accounts_currency_check check (currency in ('UAH', 'USD', 'EUR')),
  opening_balance_minor bigint not null default 0,
  opening_balance_on date not null,
  color text constraint accounts_color_check
    check (color in ('blue', 'cyan', 'green', 'lime', 'orange', 'pink', 'purple', 'red', 'teal', 'yellow')),
  icon text,
  include_in_total boolean not null default true,
  include_in_available boolean not null default true,
  sort_order int not null default 0,
  archived_at timestamptz,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint accounts_ledger_id_id_key unique (ledger_id, id),
  -- operations and transfers reference (ledger_id, account_id, currency): the amount is always in the account currency
  constraint accounts_ledger_id_id_currency_key unique (ledger_id, id, currency)
);
create index accounts_ledger_id_archived_at_sort_order_idx on public.accounts (ledger_id, archived_at, sort_order);
create index accounts_created_by_idx on public.accounts (created_by);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  kind text not null constraint categories_kind_check check (kind in ('income', 'expense')),
  parent_id uuid,
  -- two levels at most, category and subcategory (§2, §6): categories_parent_fkey accepts only a top-level parent,
  -- and a category with subcategories cannot get a parent (its children's FK would break)
  depth smallint generated always as (case when parent_id is null then 1 else 2 end) stored,
  parent_depth smallint generated always as (case when parent_id is not null then 1 end) stored,
  name text not null,
  color text constraint categories_color_check
    check (color in ('blue', 'cyan', 'green', 'lime', 'orange', 'pink', 'purple', 'red', 'teal', 'yellow')),
  icon text,
  sort_order int not null default 0,
  archived_at timestamptz,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint categories_ledger_id_id_key unique (ledger_id, id),
  constraint categories_ledger_id_id_kind_key unique (ledger_id, id, kind),
  constraint categories_ledger_id_id_kind_depth_key unique (ledger_id, id, kind, depth),
  constraint categories_no_self_parent check (parent_id <> id),
  -- a subcategory lives in the same space, has the kind of its parent and a top-level parent; no action (not
  -- restrict) so a space deletion that cascades to parent and child in one statement passes
  constraint categories_parent_fkey foreign key (ledger_id, parent_id, kind, parent_depth)
    references public.categories (ledger_id, id, kind, depth)
);
create index categories_ledger_id_kind_sort_order_idx on public.categories (ledger_id, kind, sort_order);
create index categories_ledger_id_parent_id_idx on public.categories (ledger_id, parent_id) where parent_id is not null;
create index categories_created_by_idx on public.categories (created_by);

create table public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  base_currency text not null constraint fx_rates_base_currency_check check (base_currency in ('UAH', 'USD', 'EUR')),
  quote_currency text not null constraint fx_rates_quote_currency_check check (quote_currency in ('UAH', 'USD', 'EUR')),
  -- amount of quote_currency for 1 base_currency (EUR→UAH 41.5)
  rate numeric(20, 10) not null constraint fx_rates_rate_positive check (rate > 0),
  rate_on date not null,
  source text not null default 'manual' constraint fx_rates_source_check check (source in ('manual', 'reference')),
  source_name text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint fx_rates_distinct_currencies check (base_currency <> quote_currency),
  constraint fx_rates_unique unique (ledger_id, base_currency, quote_currency, rate_on, source)
);
create index fx_rates_created_by_idx on public.fx_rates (created_by);

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  from_account_id uuid not null,
  from_amount_minor bigint not null constraint transfers_from_amount_positive check (from_amount_minor > 0),
  from_currency text not null,
  to_account_id uuid not null,
  to_amount_minor bigint not null constraint transfers_to_amount_positive check (to_amount_minor > 0),
  to_currency text not null,
  -- in the source account currency; an expense of its own, not part of the moved amount (§5)
  fee_minor bigint constraint transfers_fee_positive check (fee_minor is null or fee_minor > 0),
  occurred_at timestamptz not null,
  note text,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint transfers_ledger_id_id_key unique (ledger_id, id),
  constraint transfers_distinct_accounts check (from_account_id <> to_account_id),
  constraint transfers_from_account_fkey foreign key (ledger_id, from_account_id, from_currency)
    references public.accounts (ledger_id, id, currency),
  constraint transfers_to_account_fkey foreign key (ledger_id, to_account_id, to_currency)
    references public.accounts (ledger_id, id, currency)
);
create index transfers_from_account_idx on public.transfers (ledger_id, from_account_id, from_currency);
create index transfers_to_account_idx on public.transfers (ledger_id, to_account_id, to_currency);
create index transfers_created_by_idx on public.transfers (created_by);

create table public.operations (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  kind text not null constraint operations_kind_check
    check (kind in ('income', 'expense', 'refund', 'adjustment', 'transfer_out', 'transfer_in', 'debt_out', 'debt_in')),
  direction text not null constraint operations_direction_check check (direction in ('in', 'out')),
  account_id uuid not null,
  amount_minor bigint not null constraint operations_amount_positive check (amount_minor > 0),
  currency text not null,
  occurred_at timestamptz not null,
  occurred_on date not null, -- local date in ledgers.time_zone
  category_id uuid,
  -- which category kind this operation may carry: a refund returns money to an expense category (§4), never income
  category_kind text generated always as (
    case when kind = 'income' then 'income' when kind in ('expense', 'refund') then 'expense' end
  ) stored,
  counterparty text,
  note text,
  base_currency text not null constraint operations_base_currency_check check (base_currency in ('UAH', 'USD', 'EUR')),
  base_amount_minor bigint, -- null = rate unknown (§20), never 0
  fx_rate numeric(20, 10),
  fx_source text,
  fx_rate_on date,
  transfer_id uuid,
  refund_of_id uuid,
  duplicated_from_id uuid,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint operations_ledger_id_id_key unique (ledger_id, id),
  constraint operations_kind_direction check (
    kind = 'adjustment'
    or (kind in ('income', 'refund', 'transfer_in', 'debt_in') and direction = 'in')
    or (kind in ('expense', 'transfer_out', 'debt_out') and direction = 'out')
  ),
  constraint operations_adjustment_note check (kind <> 'adjustment' or note is not null),
  -- transfer legs always carry transfer_id; the only other kind that may is the transfer fee (an expense)
  constraint operations_transfer_link check (
    case when kind in ('transfer_out', 'transfer_in') then transfer_id is not null
    else transfer_id is null or kind = 'expense' end
  ),
  constraint operations_category_allowed check (category_id is null or category_kind is not null),
  constraint operations_refund_link check (refund_of_id is null or kind = 'refund'),
  constraint operations_base_amount_same_currency check (currency <> base_currency or base_amount_minor = amount_minor),
  constraint operations_account_fkey foreign key (ledger_id, account_id, currency)
    references public.accounts (ledger_id, id, currency),
  constraint operations_category_fkey foreign key (ledger_id, category_id, category_kind)
    references public.categories (ledger_id, id, kind),
  constraint operations_transfer_fkey foreign key (ledger_id, transfer_id)
    references public.transfers (ledger_id, id) on delete cascade,
  constraint operations_refund_of_fkey foreign key (ledger_id, refund_of_id)
    references public.operations (ledger_id, id) on delete set null (refund_of_id),
  constraint operations_duplicated_from_fkey foreign key (ledger_id, duplicated_from_id)
    references public.operations (ledger_id, id) on delete set null (duplicated_from_id)
);
create index operations_ledger_id_occurred_on_id_idx on public.operations (ledger_id, occurred_on desc, id);
create index operations_ledger_id_account_id_occurred_on_idx on public.operations (ledger_id, account_id, occurred_on);
create index operations_ledger_id_category_id_occurred_on_idx on public.operations (ledger_id, category_id, occurred_on);
create index operations_ledger_id_created_by_occurred_on_idx on public.operations (ledger_id, created_by, occurred_on);
create index operations_created_by_idx on public.operations (created_by);
create index operations_transfer_id_idx on public.operations (ledger_id, transfer_id) where transfer_id is not null;
create index operations_refund_of_id_idx on public.operations (ledger_id, refund_of_id) where refund_of_id is not null;
create index operations_duplicated_from_id_idx on public.operations (ledger_id, duplicated_from_id)
  where duplicated_from_id is not null;
create index operations_search_idx on public.operations
  using gin ((coalesce(counterparty, '') || ' ' || coalesce(note, '')) extensions.gin_trgm_ops);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  owner_type text not null constraint attachments_owner_type_check check (owner_type in ('operation', 'tax_liability', 'service')),
  owner_id uuid not null, -- polymorphic, no FK; the owner's RPC removes its attachments
  -- {ledger_id}/{owner_type}/{owner_id}/{uuid}.{ext}: the first folder is what the Storage policies check
  storage_path text not null constraint attachments_storage_path_key unique,
  mime text not null,
  size_bytes bigint not null constraint attachments_size_check check (size_bytes > 0 and size_bytes <= 52428800),
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  constraint attachments_ledger_id_id_key unique (ledger_id, id),
  constraint attachments_storage_path_in_ledger check (starts_with(storage_path, ledger_id::text || '/'))
);
create index attachments_ledger_id_owner_idx on public.attachments (ledger_id, owner_type, owner_id);
create index attachments_created_by_idx on public.attachments (created_by);

-- Balance = opening + Σ in − Σ out over operations only; reserves and withholdings never change it (§5.9)
create view public.account_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.ledger_id,
  a.currency,
  (a.opening_balance_minor
    + coalesce(sum(case o.direction when 'in' then o.amount_minor else -o.amount_minor end), 0))::bigint as balance_minor
from public.accounts a
left join public.operations o on o.ledger_id = a.ledger_id and o.account_id = a.id
group by a.id;

-- Standard categories of §6 for a new space. Names are in Ukrainian (the default locale); people rename them.
create function private.seed_categories(p_ledger_id uuid, p_created_by uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.categories (ledger_id, kind, name, color, sort_order, created_by)
  select p_ledger_id, c.kind, c.name, c.color, c.sort_order, p_created_by
  from (values
    ('expense', 'Житло', 'blue', 1), ('expense', 'Продукти', 'green', 2), ('expense', 'Кафе', 'yellow', 3),
    ('expense', 'Транспорт', 'cyan', 4), ('expense', 'Авто', 'orange', 5), ('expense', 'Підписки', 'pink', 6),
    ('expense', 'Здоров''я', 'red', 7), ('expense', 'Покупки', 'purple', 8), ('expense', 'Відпочинок', 'teal', 9),
    ('expense', 'Податки', null, 10), ('expense', 'Інше', null, 11),
    ('income', 'Зарплата', 'green', 1), ('income', 'Фриланс', 'lime', 2), ('income', 'Подарунки', 'pink', 3),
    ('income', 'Інше', null, 4)
  ) as c (kind, name, color, sort_order)
$$;
revoke execute on function private.seed_categories(uuid, uuid) from public;

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_ledger_id uuid := gen_random_uuid();
begin
  insert into public.ledgers (id, name, created_by) values (v_ledger_id, 'Мій простір', new.id);
  insert into public.ledger_members (ledger_id, user_id, role) values (v_ledger_id, new.id, 'owner');
  insert into public.user_settings (user_id, last_ledger_id) values (new.id, v_ledger_id);
  perform private.seed_categories(v_ledger_id, new.id);
  return new;
end $$;

-- Spaces created before this migration get the same starting set, authored by their owner
select private.seed_categories(m.ledger_id, m.user_id) from public.ledger_members m where m.role = 'owner';

create trigger accounts_bump_version before update on public.accounts for each row execute function private.bump_version();
create trigger categories_bump_version before update on public.categories for each row execute function private.bump_version();
create trigger fx_rates_bump_version before update on public.fx_rates for each row execute function private.bump_version();
create trigger transfers_bump_version before update on public.transfers for each row execute function private.bump_version();
create trigger operations_bump_version before update on public.operations for each row execute function private.bump_version();
create trigger accounts_keep_created_by before update on public.accounts for each row execute function private.keep_created_by();
create trigger categories_keep_created_by before update on public.categories for each row execute function private.keep_created_by();
create trigger fx_rates_keep_created_by before update on public.fx_rates for each row execute function private.keep_created_by();
create trigger transfers_keep_created_by before update on public.transfers for each row execute function private.keep_created_by();
create trigger operations_keep_created_by before update on public.operations for each row execute function private.keep_created_by();
create trigger attachments_keep_created_by before update on public.attachments for each row execute function private.keep_created_by();

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.fx_rates enable row level security;
alter table public.transfers enable row level security;
alter table public.operations enable row level security;
alter table public.attachments enable row level security;

create policy accounts_read on public.accounts for select to authenticated using (ledger_id in (select private.my_ledger_ids()));
create policy accounts_write on public.accounts for all to authenticated
  using (ledger_id in (select private.my_writable_ledger_ids())) with check (ledger_id in (select private.my_writable_ledger_ids()));
create policy categories_read on public.categories for select to authenticated using (ledger_id in (select private.my_ledger_ids()));
create policy categories_write on public.categories for all to authenticated
  using (ledger_id in (select private.my_writable_ledger_ids())) with check (ledger_id in (select private.my_writable_ledger_ids()));
create policy fx_rates_read on public.fx_rates for select to authenticated using (ledger_id in (select private.my_ledger_ids()));
create policy fx_rates_write on public.fx_rates for all to authenticated
  using (ledger_id in (select private.my_writable_ledger_ids())) with check (ledger_id in (select private.my_writable_ledger_ids()));
create policy transfers_read on public.transfers for select to authenticated using (ledger_id in (select private.my_ledger_ids()));
create policy operations_read on public.operations for select to authenticated using (ledger_id in (select private.my_ledger_ids()));
create policy attachments_read on public.attachments for select to authenticated using (ledger_id in (select private.my_ledger_ids()));
create policy attachments_write on public.attachments for all to authenticated
  using (ledger_id in (select private.my_writable_ledger_ids())) with check (ledger_id in (select private.my_writable_ledger_ids()));

revoke all on table public.accounts, public.categories, public.fx_rates, public.transfers, public.operations,
  public.attachments, public.account_balances from anon, authenticated;
grant select, insert, update, delete on table public.accounts, public.categories, public.fx_rates to authenticated;
-- money moves only through the security definer RPCs of money_rpc.sql: transfer legs, payments and versions span rows
grant select on table public.transfers, public.operations to authenticated;
grant select, insert, delete on table public.attachments to authenticated;
grant select on table public.account_balances to authenticated;

-- Private bucket for receipts (ADR 16, architecture §8): the first folder of the object name is the ledger id
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 52428800)
on conflict (id) do nothing;

create policy attachments_objects_read on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] in (select private.my_ledger_ids()::text));
create policy attachments_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] in (select private.my_writable_ledger_ids()::text));
create policy attachments_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] in (select private.my_writable_ledger_ids()::text));
