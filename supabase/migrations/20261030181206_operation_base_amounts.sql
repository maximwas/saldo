-- Base amounts of foreign-currency operations (review of phase 1 wave B): the server converts every operation, a transfer
-- leg or fee included, to the space's base currency on its date by rule A and keeps the rate as a snapshot (§21: a new
-- rate does not rewrite history). No rate → base_amount_minor stays null (unknown, never 0). Clients no longer send
-- base_amount_minor or fx_*: whatever they send is ignored.

-- The space's rate for p_from → p_to on p_on by rule A (Maxim, 2026-10-30), as findRate in src/lib/money/fx.utils.ts:
-- the exact pair before its inverse; within it the newest rate_on on or before p_on, and on that same date manual
-- beats reference (an older manual never beats a newer reference). A null row when none is known.
create function private.pick_rate(p_ledger_id uuid, p_from text, p_to text, p_on date) returns public.fx_rates
language sql stable set search_path = '' as $$
  select r.* from public.fx_rates r
  where r.ledger_id = p_ledger_id and r.rate_on <= p_on
    and ((r.base_currency = p_from and r.quote_currency = p_to) or (r.base_currency = p_to and r.quote_currency = p_from))
  order by r.base_currency = p_from desc, r.rate_on desc, r.source = 'manual' desc
  limit 1
$$;

-- Rounds half up like the client (decimal.js ROUND_HALF_UP). Null when no rate is known.
-- shortcut: no cross rate through a third currency (findRate has one); add it when USD↔EUR payments need it.
create or replace function private.convert_minor(p_ledger_id uuid, p_amount_minor bigint, p_from text, p_to text,
  p_on date)
returns bigint
language sql stable set search_path = '' as $$
  select case when p_from = p_to then p_amount_minor else (
    select round(case when r.base_currency = p_from then p_amount_minor * r.rate else p_amount_minor / r.rate end)::bigint
    from private.pick_rate(p_ledger_id, p_from, p_to, p_on) r
  ) end
$$;

-- Fills what the server owns: direction from kind, local date in the space's time zone, base-currency snapshot.
-- The snapshot is taken once: a row that already has base_amount_minor keeps it (callers clear it when the amount,
-- currency or date changes). fx_rate = base-currency units per 1 unit of the operation currency.
create or replace function private.prepare_operation(v public.operations) returns public.operations
language plpgsql stable set search_path = '' as $$
declare
  l public.ledgers;
  r public.fx_rates;
begin
  select * into l from public.ledgers where id = v.ledger_id;
  if not found then
    raise exception 'space not found' using errcode = '42501';
  end if;
  if v.kind <> 'adjustment' then
    v.direction := case when v.kind in ('income', 'refund', 'transfer_in', 'debt_in') then 'in' else 'out' end;
  end if;
  v.occurred_on := coalesce(v.occurred_on, (v.occurred_at at time zone l.time_zone)::date);
  v.base_currency := l.base_currency;
  if v.currency = v.base_currency then
    v.base_amount_minor := v.amount_minor;
    v.fx_rate := null;
    v.fx_source := null;
    v.fx_rate_on := null;
  elsif v.base_amount_minor is null then
    r := private.pick_rate(v.ledger_id, v.currency, v.base_currency, v.occurred_on);
    v.base_amount_minor := private.convert_minor(v.ledger_id, v.amount_minor, v.currency, v.base_currency,
      v.occurred_on);
    v.fx_rate := case when r.base_currency = v.currency then r.rate else round(1 / r.rate, 10) end;
    v.fx_source := r.source;
    v.fx_rate_on := r.rate_on;
  end if;
  return v;
end $$;

revoke execute on function private.pick_rate(uuid, text, text, date) from public;

create or replace function public.create_operation(p_operation jsonb) returns public.operations
language plpgsql security definer set search_path = '' as $$
declare
  v public.operations := jsonb_populate_record(null::public.operations,
    p_operation - array['base_amount_minor', 'fx_rate', 'fx_source', 'fx_rate_on']);
begin
  perform private.assert_writable(v.ledger_id);
  if v.kind in ('transfer_out', 'transfer_in') then
    raise exception 'transfer legs are created by create_transfer' using errcode = '22023';
  end if;
  v.transfer_id := null;
  return private.insert_operation(private.prepare_operation(v));
end $$;

create or replace function public.update_operation(p_id uuid, p_expected_version int, p_patch jsonb)
returns public.operations
language plpgsql security definer set search_path = '' as $$
declare
  o public.operations;
  v public.operations;
begin
  select * into o from public.operations where id = p_id for update;
  if not found then
    raise exception 'operation not found' using errcode = 'P0002';
  end if;
  perform private.assert_writable(o.ledger_id);
  if o.version is distinct from p_expected_version then
    raise exception 'operation was changed by someone else' using errcode = 'PT409';
  end if;
  if o.transfer_id is not null or p_patch ->> 'kind' in ('transfer_out', 'transfer_in') then
    raise exception 'transfers are changed as a whole' using errcode = '22023';
  end if;

  v := jsonb_populate_record(o, p_patch - array['id', 'ledger_id', 'transfer_id', 'category_kind', 'created_by',
    'created_at', 'updated_at', 'version', 'base_currency', 'base_amount_minor', 'fx_rate', 'fx_source', 'fx_rate_on']);
  if p_patch ? 'occurred_at' and not p_patch ? 'occurred_on' then
    v.occurred_on := null;
  end if;
  v := private.prepare_operation(v);
  -- compared by value (the form sends every field): a new amount, currency or date takes the snapshot again; a note or
  -- category edit keeps the old rate even when a newer one exists (§21)
  if (v.amount_minor, v.currency, v.occurred_on) is distinct from (o.amount_minor, o.currency, o.occurred_on) then
    v.base_amount_minor := null;
    v := private.prepare_operation(v);
  end if;
  -- payments keep their part in the operation currency (obligation_payments.operation_amount_minor)
  if v.currency <> o.currency and exists (select 1 from public.obligation_payments where operation_id = p_id) then
    raise exception 'an operation that pays obligations keeps its currency' using errcode = '22023';
  end if;

  update public.operations set (kind, direction, account_id, amount_minor, currency, occurred_at, occurred_on,
    category_id, counterparty, note, base_currency, base_amount_minor, fx_rate, fx_source, fx_rate_on, refund_of_id,
    duplicated_from_id) = (v.kind, v.direction, v.account_id, v.amount_minor, v.currency, v.occurred_at, v.occurred_on,
    v.category_id, v.counterparty, v.note, v.base_currency, v.base_amount_minor, v.fx_rate, v.fx_source, v.fx_rate_on,
    v.refund_of_id, v.duplicated_from_id)
  where id = p_id
  returning * into o;

  perform private.assert_payments_fit(p_id);
  update public.obligations set updated_at = now()
  where id in (select obligation_id from public.obligation_payments where operation_id = p_id);
  return o;
end $$;

-- Rows written before this migration without a known rate get one now if the space has it: unknown → known, nothing
-- that already had a snapshot is touched
update public.operations o
set (base_amount_minor, fx_rate, fx_source, fx_rate_on) =
  (select p.base_amount_minor, p.fx_rate, p.fx_source, p.fx_rate_on from private.prepare_operation(o) p)
where o.base_amount_minor is null and o.currency <> o.base_currency;
