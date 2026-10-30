-- A refund returns (part of) one purchase (§5): it points to an expense of the same space (the composite FK), in that
-- purchase's currency, and all refunds of a purchase together never exceed it. Checked after the write, like
-- assert_payments_fit; the purchase row is locked first, so two refunds at the same moment cannot both fit.
create function private.assert_refund_fits(p_purchase_id uuid) returns void
language plpgsql set search_path = '' as $$
declare
  p public.operations;
begin
  if p_purchase_id is null or not exists (select 1 from public.operations where refund_of_id = p_purchase_id) then
    return;
  end if;
  select * into p from public.operations where id = p_purchase_id for update;
  if p.kind <> 'expense' then
    raise exception 'a refund returns an expense' using errcode = '22023';
  end if;
  if exists (select 1 from public.operations r where r.refund_of_id = p_purchase_id and r.currency <> p.currency) then
    raise exception 'a refund is in the currency of its purchase' using errcode = '22023';
  end if;
  if (select sum(r.amount_minor) from public.operations r where r.refund_of_id = p_purchase_id) > p.amount_minor then
    raise exception 'new row for relation "operations" violates check constraint "operations_refund_within_purchase"'
      using errcode = '23514', constraint = 'operations_refund_within_purchase';
  end if;
end $$;

revoke execute on function private.assert_refund_fits(uuid) from public;

create or replace function public.create_operation(p_operation jsonb) returns public.operations
language plpgsql security definer set search_path = '' as $$
declare
  v public.operations := jsonb_populate_record(null::public.operations,
    p_operation - array['base_amount_minor', 'fx_rate', 'fx_source', 'fx_rate_on']);
  r public.operations;
begin
  perform private.assert_writable(v.ledger_id);
  if v.kind in ('transfer_out', 'transfer_in') then
    raise exception 'transfer legs are created by create_transfer' using errcode = '22023';
  end if;
  v.transfer_id := null;
  r := private.insert_operation(private.prepare_operation(v));
  perform private.assert_refund_fits(r.refund_of_id);
  return r;
end $$;

-- as in 20261030181206_operation_base_amounts, plus the refund check for the edited row as a refund and as a purchase
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
  perform private.assert_refund_fits(o.refund_of_id);
  perform private.assert_refund_fits(p_id);
  update public.obligations set updated_at = now()
  where id in (select obligation_id from public.obligation_payments where operation_id = p_id);
  return o;
end $$;
