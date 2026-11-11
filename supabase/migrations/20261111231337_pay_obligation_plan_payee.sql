-- A payment's new operation is named after its plan and takes the plan's category unless the caller sent its own.
-- Both callers (the app's «Paid» sheet and the MCP mark_paid tool) sent no payee, so Operations, Budget, Statistics
-- and the CSV showed a category or «Expense» where the calendar showed the plan's title (QA 12.11). The rest of the
-- function is as in 20261030161737_money_rpc.sql.
create or replace function public.pay_obligation(p_payment_id uuid, p_obligation_id uuid, p_expected_version int,
  p_amount_minor bigint, p_operation jsonb default null, p_existing_operation_id uuid default null,
  p_settle boolean default false)
returns setof public.obligation_states
language plpgsql security definer set search_path = '' as $$
declare
  o public.obligations;
  op public.operations;
  v_amount bigint;
begin
  select * into o from public.obligations where id = p_obligation_id for update;
  if not found then
    raise exception 'obligation not found' using errcode = 'P0002';
  end if;
  perform private.assert_writable(o.ledger_id);
  -- replay of a payment that already went through (offline queue): the current state, nothing written
  if exists (select 1 from public.obligation_payments where id = p_payment_id and obligation_id = o.id) then
    return query select * from public.obligation_states where obligation_id = o.id;
    return;
  end if;
  if num_nonnulls(p_operation, p_existing_operation_id) <> 1 then
    raise exception 'exactly one of p_operation and p_existing_operation_id' using errcode = '22023';
  end if;
  if o.version is distinct from p_expected_version then
    raise exception 'obligation was changed by someone else' using errcode = 'PT409';
  end if;
  if o.lifecycle <> 'active' then
    raise exception 'obligation is %', o.lifecycle using errcode = '22023';
  end if;

  if p_operation is not null then
    -- the plan's title and category fill what the caller left empty; a value the caller sent wins
    op := public.create_operation(
      jsonb_build_object('counterparty', o.title, 'category_id', o.category_id) || jsonb_strip_nulls(p_operation));
  else
    -- locked: two obligations paid from one operation at once still fit it
    select * into op from public.operations where id = p_existing_operation_id and ledger_id = o.ledger_id for update;
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

  insert into public.obligation_payments (id, ledger_id, obligation_id, operation_id, amount_minor, operation_amount_minor)
  values (p_payment_id, o.ledger_id, o.id, op.id, v_amount, p_amount_minor);
  perform private.assert_payments_fit(op.id);

  update public.obligations
  set updated_at = now(),
    settled_at = case when p_settle then now() else settled_at end,
    settled_by = case when p_settle then auth.uid() else settled_by end
  where id = o.id;
  return query select * from public.obligation_states where obligation_id = o.id;
end $$;
