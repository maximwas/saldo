-- Write RPCs of phase 1 (docs/architecture.md §5.10): one transaction per call, security invoker (RLS applies,
-- a viewer gets 42501), a repeated call with the same client id writes nothing new, a stale version raises PT409.

-- Fills what the server owns: direction from kind, local date in the space's time zone, base-currency snapshot.
-- An amount in the base currency is its own base amount; any other stays as the client converted it, or null.
create function private.prepare_operation(v public.operations) returns public.operations
language plpgsql stable set search_path = '' as $$
declare
  l public.ledgers;
begin
  select * into l from public.ledgers where id = v.ledger_id;
  if not found then
    raise exception 'not a member of this space' using errcode = '42501';
  end if;
  if v.kind <> 'adjustment' then
    v.direction := case when v.kind in ('income', 'refund', 'transfer_in', 'debt_in') then 'in' else 'out' end;
  end if;
  v.occurred_on := coalesce(v.occurred_on, (v.occurred_at at time zone l.time_zone)::date);
  v.base_currency := coalesce(v.base_currency, l.base_currency);
  if v.currency = v.base_currency then
    v.base_amount_minor := v.amount_minor;
  end if;
  return v;
end $$;

-- Explicit columns: category_kind is generated; created_by, created_at and version come from defaults
create function private.insert_operation(v public.operations) returns public.operations
language plpgsql set search_path = '' as $$
declare
  r public.operations;
begin
  insert into public.operations (id, ledger_id, kind, direction, account_id, amount_minor, currency, occurred_at,
    occurred_on, category_id, counterparty, note, base_currency, base_amount_minor, fx_rate, fx_source, fx_rate_on,
    transfer_id, refund_of_id, duplicated_from_id)
  values (v.id, v.ledger_id, v.kind, v.direction, v.account_id, v.amount_minor, v.currency, v.occurred_at,
    v.occurred_on, v.category_id, v.counterparty, v.note, v.base_currency, v.base_amount_minor, v.fx_rate, v.fx_source,
    v.fx_rate_on, v.transfer_id, v.refund_of_id, v.duplicated_from_id)
  on conflict (id) do nothing
  returning * into r;
  if r.id is null then
    select * into r from public.operations where id = v.id;
  end if;
  return r;
end $$;

-- Parts of one operation paying several obligations never exceed it. Only same-currency parts are comparable:
-- a payment amount is in the obligation currency.
create function private.assert_payments_fit(p_operation_id uuid) returns void
language plpgsql stable set search_path = '' as $$
begin
  if exists (
    select 1 from public.operations op
    where op.id = p_operation_id
      and op.amount_minor < (
        select coalesce(sum(p.amount_minor), 0) from public.obligation_payments p
        join public.obligations o on o.id = p.obligation_id
        where p.operation_id = op.id and o.currency = op.currency)
  ) then
    raise exception 'new row for relation "obligation_payments" violates check constraint "obligation_payments_within_operation"'
      using errcode = '23514', constraint = 'obligation_payments_within_operation';
  end if;
end $$;

-- Converts with the space's rate on or before p_on (manual over reference, newest first), either direction of the pair;
-- rounds half up like the client (decimal.js ROUND_HALF_UP). Null when no rate is known: unknown, never 0.
create function private.convert_minor(p_ledger_id uuid, p_amount_minor bigint, p_from text, p_to text, p_on date)
returns bigint
language sql stable set search_path = '' as $$
  select case when p_from = p_to then p_amount_minor else (
    select round(case when r.base_currency = p_from then p_amount_minor * r.rate else p_amount_minor / r.rate end)::bigint
    from public.fx_rates r
    where r.ledger_id = p_ledger_id and r.rate_on <= p_on
      and ((r.base_currency = p_from and r.quote_currency = p_to) or (r.base_currency = p_to and r.quote_currency = p_from))
    order by r.rate_on desc, r.source = 'manual' desc
    limit 1
  ) end
$$;

-- An obligation that loses a payment goes back to plan (§4): its explicit «paid in full» is cleared too
create function private.unsettle_paid_by(p_operation_id uuid) returns void
language sql set search_path = '' as $$
  update public.obligations set settled_at = null, settled_by = null
  where id in (select obligation_id from public.obligation_payments where operation_id = p_operation_id)
$$;

revoke execute on function private.prepare_operation(public.operations), private.insert_operation(public.operations),
  private.assert_payments_fit(uuid), private.unsettle_paid_by(uuid),
  private.convert_minor(uuid, bigint, text, text, date) from public;
grant execute on function private.prepare_operation(public.operations), private.insert_operation(public.operations),
  private.assert_payments_fit(uuid), private.unsettle_paid_by(uuid),
  private.convert_minor(uuid, bigint, text, text, date) to authenticated;

create function public.create_operation(p_operation jsonb) returns public.operations
language plpgsql security invoker set search_path = '' as $$
declare
  v public.operations := jsonb_populate_record(null::public.operations, p_operation);
begin
  if v.kind in ('transfer_out', 'transfer_in') then
    raise exception 'transfer legs are created by create_transfer' using errcode = '22023';
  end if;
  v.transfer_id := null;
  return private.insert_operation(private.prepare_operation(v));
end $$;

create function public.update_operation(p_id uuid, p_expected_version int, p_patch jsonb) returns public.operations
language plpgsql security invoker set search_path = '' as $$
declare
  o public.operations;
  v public.operations;
begin
  select * into o from public.operations where id = p_id for update;
  if not found then
    if exists (select 1 from public.operations where id = p_id) then
      raise exception 'read-only member' using errcode = '42501';
    end if;
    raise exception 'operation not found' using errcode = 'P0002';
  end if;
  if o.version <> p_expected_version then
    raise exception 'operation was changed by someone else' using errcode = 'PT409';
  end if;
  if o.transfer_id is not null or p_patch ->> 'kind' in ('transfer_out', 'transfer_in') then
    raise exception 'transfers are changed as a whole' using errcode = '22023';
  end if;

  v := jsonb_populate_record(o, p_patch - array['id', 'ledger_id', 'transfer_id', 'category_kind', 'created_by',
    'created_at', 'updated_at', 'version']);
  -- a new amount, currency or account makes the old base-currency snapshot wrong: unknown, not stale (§20)
  if (p_patch ?| array['amount_minor', 'currency', 'account_id']) and not p_patch ? 'base_amount_minor' then
    v.base_amount_minor := null;
    v.fx_rate := null;
    v.fx_source := null;
    v.fx_rate_on := null;
  end if;
  if p_patch ? 'occurred_at' and not p_patch ? 'occurred_on' then
    v.occurred_on := null;
  end if;
  v := private.prepare_operation(v);

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

-- A transfer leg deletes the whole transfer (both legs and the fee); the fee alone can be deleted.
-- Payments go by cascade and their obligations return to plan. A repeated delete is a no-op.
create function public.delete_operation(p_id uuid, p_expected_version int) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  o public.operations;
begin
  select * into o from public.operations where id = p_id for update;
  if not found then
    if exists (select 1 from public.operations where id = p_id) then
      raise exception 'read-only member' using errcode = '42501';
    end if;
    return;
  end if;
  if o.version <> p_expected_version then
    raise exception 'operation was changed by someone else' using errcode = 'PT409';
  end if;

  perform private.unsettle_paid_by(p_id);
  if o.transfer_id is not null and o.kind <> 'expense' then
    delete from public.transfers where id = o.transfer_id;
  else
    delete from public.operations where id = p_id;
  end if;
end $$;

-- transfers + transfer_out + transfer_in (+ the fee as an expense on the source account). Actual amounts are kept
-- as entered, never fitted to a rate (§5). Leg ids are server-made: the transfer id is the idempotency key.
create function public.create_transfer(p_transfer jsonb) returns public.transfers
language plpgsql security invoker set search_path = '' as $$
declare
  t public.transfers := jsonb_populate_record(null::public.transfers, p_transfer);
  r public.transfers;
  v_leg jsonb;
begin
  select * into r from public.transfers where id = t.id;
  if found then
    return r;
  end if;

  insert into public.transfers (id, ledger_id, from_account_id, from_amount_minor, from_currency, to_account_id,
    to_amount_minor, to_currency, fee_minor, occurred_at, note)
  values (t.id, t.ledger_id, t.from_account_id, t.from_amount_minor, t.from_currency, t.to_account_id,
    t.to_amount_minor, t.to_currency, t.fee_minor, t.occurred_at, t.note)
  on conflict (id) do nothing
  returning * into r;
  if r.id is null then
    select * into r from public.transfers where id = t.id;
    return r;
  end if;

  v_leg := jsonb_build_object('ledger_id', r.ledger_id, 'occurred_at', r.occurred_at,
    'occurred_on', p_transfer -> 'occurred_on', 'note', r.note, 'transfer_id', r.id);
  perform private.insert_operation(private.prepare_operation(jsonb_populate_record(null::public.operations,
    v_leg || jsonb_build_object('id', gen_random_uuid(), 'kind', 'transfer_out', 'account_id', r.from_account_id,
      'amount_minor', r.from_amount_minor, 'currency', r.from_currency))));
  perform private.insert_operation(private.prepare_operation(jsonb_populate_record(null::public.operations,
    v_leg || jsonb_build_object('id', gen_random_uuid(), 'kind', 'transfer_in', 'account_id', r.to_account_id,
      'amount_minor', r.to_amount_minor, 'currency', r.to_currency))));
  if r.fee_minor is not null then
    perform private.insert_operation(private.prepare_operation(jsonb_populate_record(null::public.operations,
      v_leg || jsonb_build_object('id', gen_random_uuid(), 'kind', 'expense', 'account_id', r.from_account_id,
        'amount_minor', r.fee_minor, 'currency', r.from_currency,
        'category_id', p_transfer -> 'fee_category_id'))));
  end if;
  return r;
end $$;

-- Exactly one of p_operation (a new operation with its own client id) or p_existing_operation_id (link an operation
-- that is already there, no second debit, §4, §7). p_settle marks «paid in full» (unknown amount, early payoff).
-- Reserves (p_reserve_id) arrive with the reserves table.
-- p_amount_minor is in the paying operation's currency (what the form shows); the payment row stores it in the
-- obligation currency (architecture §5.3), converted by the space's rate on the operation date.
create function public.pay_obligation(p_payment_id uuid, p_obligation_id uuid, p_expected_version int,
  p_amount_minor bigint, p_operation jsonb default null, p_existing_operation_id uuid default null,
  p_settle boolean default false)
returns setof public.obligation_states
language plpgsql security invoker set search_path = '' as $$
declare
  o public.obligations;
  op public.operations;
  v_amount bigint;
begin
  -- replay of a payment that already went through (offline queue): the current state, nothing written
  if exists (select 1 from public.obligation_payments where id = p_payment_id) then
    return query select * from public.obligation_states where obligation_id = p_obligation_id;
    return;
  end if;
  if num_nonnulls(p_operation, p_existing_operation_id) <> 1 then
    raise exception 'exactly one of p_operation and p_existing_operation_id' using errcode = '22023';
  end if;

  select * into o from public.obligations where id = p_obligation_id for update;
  if not found then
    if exists (select 1 from public.obligations where id = p_obligation_id) then
      raise exception 'read-only member' using errcode = '42501';
    end if;
    raise exception 'obligation not found' using errcode = 'P0002';
  end if;
  if o.version <> p_expected_version then
    raise exception 'obligation was changed by someone else' using errcode = 'PT409';
  end if;
  if o.lifecycle <> 'active' then
    raise exception 'obligation is %', o.lifecycle using errcode = '22023';
  end if;

  if p_operation is not null then
    op := public.create_operation(p_operation);
  else
    select * into op from public.operations where id = p_existing_operation_id;
    if not found then
      raise exception 'operation not found' using errcode = 'P0002';
    end if;
  end if;
  if op.direction <> o.direction then
    raise exception 'operation direction differs from the obligation' using errcode = '22023';
  end if;

  v_amount := private.convert_minor(o.ledger_id, p_amount_minor, op.currency, o.currency, op.occurred_on);
  if v_amount is null then
    raise exception 'no % → % rate on or before %', op.currency, o.currency, op.occurred_on using errcode = '22023';
  end if;

  insert into public.obligation_payments (id, ledger_id, obligation_id, operation_id, amount_minor)
  values (p_payment_id, o.ledger_id, o.id, op.id, v_amount);
  perform private.assert_payments_fit(op.id);

  update public.obligations
  set updated_at = now(),
    settled_at = case when p_settle then now() else settled_at end,
    settled_by = case when p_settle then auth.uid() else settled_by end
  where id = o.id;
  return query select * from public.obligation_states where obligation_id = o.id;
end $$;

-- Cancels a payment; with p_delete_operation the operation goes too (and with it any other payment it made).
-- A repeated call is a no-op.
create function public.delete_obligation_payment(p_payment_id uuid, p_delete_operation boolean default false)
returns setof public.obligation_states
language plpgsql security invoker set search_path = '' as $$
declare
  p public.obligation_payments;
  v_count int;
begin
  select * into p from public.obligation_payments where id = p_payment_id;
  if not found then
    return;
  end if;
  perform 1 from public.obligations where id = p.obligation_id for update;

  if p_delete_operation then
    perform private.unsettle_paid_by(p.operation_id);
    delete from public.operations where id = p.operation_id;
  else
    update public.obligations set settled_at = null, settled_by = null where id = p.obligation_id;
    delete from public.obligation_payments where id = p_payment_id;
  end if;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'read-only member' using errcode = '42501';
  end if;

  update public.obligations set updated_at = now() where id = p.obligation_id;
  return query select * from public.obligation_states where obligation_id = p.obligation_id;
end $$;

-- Archives a category with its subcategories; with p_move_to their operations and obligations move there first.
-- Operations are never destroyed (§6). The move target must have the same kind (operations_category_fkey).
create function public.archive_category(p_id uuid, p_move_to uuid default null) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  c public.categories;
begin
  select * into c from public.categories where id = p_id for update;
  if not found then
    if exists (select 1 from public.categories where id = p_id) then
      raise exception 'read-only member' using errcode = '42501';
    end if;
    raise exception 'category not found' using errcode = 'P0002';
  end if;

  if p_move_to is not null then
    if p_move_to = p_id or exists (select 1 from public.categories where id = p_move_to and parent_id = p_id) then
      raise exception 'cannot move into the archived category' using errcode = '22023';
    end if;
    update public.operations set category_id = p_move_to
    where ledger_id = c.ledger_id
      and category_id in (select id from public.categories where ledger_id = c.ledger_id and (id = p_id or parent_id = p_id));
    update public.obligations set category_id = p_move_to
    where ledger_id = c.ledger_id
      and category_id in (select id from public.categories where ledger_id = c.ledger_id and (id = p_id or parent_id = p_id));
  end if;

  update public.categories set archived_at = now()
  where ledger_id = c.ledger_id and (id = p_id or parent_id = p_id) and archived_at is null;
end $$;

revoke execute on function public.create_operation(jsonb), public.update_operation(uuid, int, jsonb),
  public.delete_operation(uuid, int), public.create_transfer(jsonb),
  public.pay_obligation(uuid, uuid, int, bigint, jsonb, uuid, boolean),
  public.delete_obligation_payment(uuid, boolean), public.archive_category(uuid, uuid) from public, anon;
grant execute on function public.create_operation(jsonb), public.update_operation(uuid, int, jsonb),
  public.delete_operation(uuid, int), public.create_transfer(jsonb),
  public.pay_obligation(uuid, uuid, int, bigint, jsonb, uuid, boolean),
  public.delete_obligation_payment(uuid, boolean), public.archive_category(uuid, uuid) to authenticated;
