-- Write RPCs of phase 2 (docs/architecture.md §5.10): series obligations of subscriptions, subscription prices,
-- credits with their schedule, debts with their movements. As in money_rpc.sql: security definer, the target space is
-- found first and private.assert_writable runs before anything of it is read or written, one transaction per call,
-- a repeated call with the same client id writes nothing new, a stale or missing version raises PT409, an id taken
-- in another space raises 23505 without revealing the row.

-- An obligation nobody has paid yet: no payment, no explicit «paid in full». Only these follow a source's changes.
create function private.is_unpaid(o public.obligations) returns boolean
language sql stable set search_path = '' as $$
  select o.settled_at is null and not exists (select 1 from public.obligation_payments p where p.obligation_id = o.id)
$$;

-- The price of a subscription on a date: the newest effective_on on or before it. No price yet = unknown amount in
-- the subscription currency (§7: unknown, never 0).
create function private.subscription_price(s public.subscriptions, p_on date, out amount_minor bigint, out currency text)
language sql stable set search_path = '' as $$
  select x.amount_minor, x.currency from (
    select p.amount_minor, p.currency, p.effective_on from public.subscription_prices p
    where p.subscription_id = s.id and p.effective_on <= p_on
    union all
    select null, s.currency, null
  ) x
  order by x.effective_on desc nulls last
  limit 1
$$;

-- Brings the unpaid active obligations of a subscription from p_from on in line with it: title, account, category and
-- the price in force on each date. Paid ones and earlier dates keep what they had (§8, §26: history is not rewritten).
-- Rows that already match are not touched, so their version (pay_obligation's PT409 guard) stays.
create function private.refresh_subscription_obligations(s public.subscriptions, p_from date) returns int
language plpgsql set search_path = '' as $$
declare
  v_count int;
begin
  update public.obligations o
  set title = d.title, account_id = d.account_id, category_id = d.category_id,
    planned_amount_minor = d.amount_minor, currency = d.currency
  from (
    select x.id, s.name as title, s.account_id, s.category_id, pr.amount_minor, pr.currency
    from public.obligations x
    cross join lateral private.subscription_price(s, x.occurrence_on) pr
    where x.ledger_id = s.ledger_id and x.source_type = 'subscription' and x.source_id = s.id
      and x.lifecycle = 'active' and x.occurrence_on >= p_from and private.is_unpaid(x)
  ) d
  where o.id = d.id
    and (o.title, o.account_id, o.category_id, o.planned_amount_minor, o.currency)
      is distinct from (d.title, d.account_id, d.category_id, d.amount_minor, d.currency);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke execute on function private.is_unpaid(public.obligations),
  private.subscription_price(public.subscriptions, date),
  private.refresh_subscription_obligations(public.subscriptions, date) from public;

-- Materialised dates of a series. The client computes them (generateOccurrences in src/lib/recurrence) and sends
-- p_rows = [{due_on, occurrence_on?, sequence_no?, id?}]: occurrence_on (the nominal date, default due_on) is the
-- idempotency key, id is optional. The server fills the rest from the source: title, account, category, and amount +
-- currency from the price in force on occurrence_on (subscription_prices, the rule of priceOn in subscriptions.utils;
-- an amount_minor in a row is not used). A date that already has an active obligation is skipped (on conflict do
-- nothing), so a replay or the daily horizon extension writes nothing twice.
-- With p_from the series from that date on is exactly p_rows (settings changed, paused, cancelled): an unpaid date
-- that is no longer in it is cancelled, the others follow the subscription; paid ones and earlier dates stay.
-- Returns how many obligations were written.
-- shortcut: only subscriptions are series sources yet; big expenses, auto plans and income plans join with their tables.
create function public.upsert_series_obligations(p_source_type text, p_source_id uuid, p_rows jsonb,
  p_from date default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  s public.subscriptions;
  v_inserted int;
  v_cancelled int := 0;
begin
  if p_source_type is distinct from 'subscription' then
    raise exception 'not a series source: %', p_source_type using errcode = '22023';
  end if;
  select * into s from public.subscriptions where id = p_source_id for update;
  if not found then
    raise exception 'subscription not found' using errcode = 'P0002';
  end if;
  perform private.assert_writable(s.ledger_id);

  insert into public.obligations (id, ledger_id, direction, source_type, source_id, title, occurrence_on, due_on,
    sequence_no, planned_amount_minor, currency, account_id, category_id)
  select coalesce(r.id, gen_random_uuid()), s.ledger_id, 'out', 'subscription', s.id, s.name,
    coalesce(r.occurrence_on, r.due_on), coalesce(r.due_on, r.occurrence_on), r.sequence_no, pr.amount_minor,
    pr.currency, s.account_id, s.category_id
  from jsonb_to_recordset(coalesce(p_rows, '[]')) as r (id uuid, occurrence_on date, due_on date, sequence_no int)
  cross join lateral private.subscription_price(s, coalesce(r.occurrence_on, r.due_on)) pr
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  if p_from is not null then
    update public.obligations o set lifecycle = 'cancelled'
    where o.ledger_id = s.ledger_id and o.source_type = 'subscription' and o.source_id = s.id
      and o.lifecycle = 'active' and o.occurrence_on >= p_from and private.is_unpaid(o)
      and o.occurrence_on not in (select coalesce(r.occurrence_on, r.due_on)
        from jsonb_to_recordset(coalesce(p_rows, '[]')) as r (occurrence_on date, due_on date));
    get diagnostics v_cancelled = row_count;
    v_cancelled := v_cancelled + private.refresh_subscription_obligations(s, p_from);
  end if;
  return v_inserted + v_cancelled;
end $$;

-- p_price = {id, subscription_id, effective_on, amount_minor (null = unknown), currency (default: the subscription's)}.
-- A second price on the same date corrects it. Then the unpaid obligations from effective_on take the price in force
-- on their date; paid obligations, their payments and earlier dates are never rewritten (§8, §26).
create function public.set_subscription_price(p_price jsonb) returns public.subscription_prices
language plpgsql security definer set search_path = '' as $$
declare
  v public.subscription_prices := jsonb_populate_record(null::public.subscription_prices, p_price);
  s public.subscriptions;
  r public.subscription_prices;
begin
  select * into s from public.subscriptions where id = v.subscription_id for update;
  if not found then
    raise exception 'subscription not found' using errcode = 'P0002';
  end if;
  perform private.assert_writable(s.ledger_id);
  select * into r from public.subscription_prices where id = v.id;
  if found then
    if r.subscription_id <> s.id then
      raise exception 'price id is taken' using errcode = '23505';
    end if;
    return r;
  end if;

  insert into public.subscription_prices (id, ledger_id, subscription_id, effective_on, amount_minor, currency)
  values (v.id, s.ledger_id, s.id, v.effective_on, v.amount_minor, coalesce(v.currency, s.currency))
  on conflict (subscription_id, effective_on)
  do update set amount_minor = excluded.amount_minor, currency = excluded.currency
  returning * into r;
  perform private.refresh_subscription_obligations(s, r.effective_on);
  return r;
end $$;

-- Replaces the unpaid installments of a credit with p_rows = [{sequence_no, due_on, amount_minor, occurrence_on?, id?}]
-- (CreditSchedule.installments of features/credits/utils/installments.utils.ts, or typed in from the bank;
-- occurrence_on defaults to due_on, amount_minor null = unknown).
-- Unpaid active installments become 'replaced' and point at the new one with their number; paid or partly paid ones
-- stay as they are (§9). Numbers run after the installments paid before tracking: those have no rows and no
-- operations (§25).
create function private.replace_installments(c public.credits, p_rows jsonb) returns void
language plpgsql set search_path = '' as $$
declare
  v_replaced uuid[];
begin
  if exists (select 1 from jsonb_to_recordset(p_rows) as r (sequence_no int)
    where r.sequence_no is null or r.sequence_no <= c.paid_before_tracking_count or r.sequence_no > c.installments_count) then
    raise exception 'installment numbers run from % to %', c.paid_before_tracking_count + 1, c.installments_count
      using errcode = '22023';
  end if;

  with old as (
    update public.obligations o set lifecycle = 'replaced'
    where o.ledger_id = c.ledger_id and o.source_type = 'credit' and o.source_id = c.id and o.lifecycle = 'active'
      and private.is_unpaid(o)
    returning o.id
  )
  select array_agg(old.id) into v_replaced from old;

  insert into public.obligations (id, ledger_id, direction, source_type, source_id, title, occurrence_on, due_on,
    sequence_no, planned_amount_minor, currency, account_id)
  select coalesce(r.id, gen_random_uuid()), c.ledger_id, 'out', 'credit', c.id, c.name,
    coalesce(r.occurrence_on, r.due_on), coalesce(r.due_on, r.occurrence_on), r.sequence_no, r.amount_minor,
    c.currency, c.account_id
  from jsonb_to_recordset(p_rows) as r (id uuid, sequence_no int, occurrence_on date, due_on date, amount_minor bigint);

  update public.obligations o set replaced_by_id = n.id
  from public.obligations n
  where o.id = any(v_replaced) and n.ledger_id = c.ledger_id and n.source_type = 'credit' and n.source_id = c.id
    and n.lifecycle = 'active' and n.sequence_no = o.sequence_no;
end $$;
revoke execute on function private.replace_installments(public.credits, jsonb) from public;

-- Creates a credit with its schedule, or edits one. A create is p_credit without 'version' (a replay returns the row,
-- nothing written); an edit carries the version it was made from (stale → PT409) and patches the given fields.
-- Unpaid installments follow the credit's name, account and currency; a non-null p_installments replaces the schedule
-- (see private.replace_installments); a closed or cancelled credit cancels its unpaid installments.
-- No operation is ever written: the purchase price is not an expense (§9), paid_before_tracking_* has no past
-- operations (§25).
create function public.save_credit(p_credit jsonb, p_installments jsonb default null) returns public.credits
language plpgsql security definer set search_path = '' as $$
declare
  v public.credits := jsonb_populate_record(null::public.credits, p_credit);
  c public.credits;
begin
  perform private.assert_writable(v.ledger_id);
  select * into c from public.credits where id = v.id for update;
  if not found then
    insert into public.credits (id, ledger_id, name, lender, purchase_price_minor, total_payable_minor, currency,
      opened_on, installments_count, regular_installment_minor, last_installment_minor, account_id, fees_note,
      schedule_accuracy, paid_before_tracking_count, paid_before_tracking_minor, status, note)
    values (v.id, v.ledger_id, v.name, v.lender, v.purchase_price_minor, v.total_payable_minor, v.currency,
      v.opened_on, v.installments_count, v.regular_installment_minor, v.last_installment_minor, v.account_id,
      v.fees_note, coalesce(v.schedule_accuracy, 'estimated'), coalesce(v.paid_before_tracking_count, 0),
      v.paid_before_tracking_minor, coalesce(v.status, 'active'), v.note)
    returning * into c;
    perform private.replace_installments(c, coalesce(p_installments, '[]'));
    return c;
  end if;
  if c.ledger_id <> v.ledger_id then
    raise exception 'credit id is taken' using errcode = '23505';
  end if;
  if not p_credit ? 'version' then
    return c;
  end if;
  if c.version is distinct from v.version then
    raise exception 'credit was changed by someone else' using errcode = 'PT409';
  end if;

  v := jsonb_populate_record(c, p_credit - array['id', 'ledger_id', 'created_by', 'created_at', 'updated_at', 'version']);
  update public.credits set (name, lender, purchase_price_minor, total_payable_minor, currency, opened_on,
    installments_count, regular_installment_minor, last_installment_minor, account_id, fees_note, schedule_accuracy,
    paid_before_tracking_count, paid_before_tracking_minor, status, note) = (v.name, v.lender, v.purchase_price_minor,
    v.total_payable_minor, v.currency, v.opened_on, v.installments_count, v.regular_installment_minor,
    v.last_installment_minor, v.account_id, v.fees_note, v.schedule_accuracy, v.paid_before_tracking_count,
    v.paid_before_tracking_minor, v.status, v.note)
  where id = c.id
  returning * into c;

  update public.obligations o set title = c.name, account_id = c.account_id, currency = c.currency
  where o.ledger_id = c.ledger_id and o.source_type = 'credit' and o.source_id = c.id and o.lifecycle = 'active'
    and private.is_unpaid(o) and (o.title, o.account_id, o.currency) is distinct from (c.name, c.account_id, c.currency);
  if c.status <> 'active' then
    update public.obligations o set lifecycle = 'cancelled'
    where o.ledger_id = c.ledger_id and o.source_type = 'credit' and o.source_id = c.id and o.lifecycle = 'active'
      and private.is_unpaid(o);
  elsif p_installments is not null then
    perform private.replace_installments(c, p_installments);
  end if;
  return c;
end $$;

-- A new schedule after an early payoff or the bank's recalculation (§9: confirmed by the person, never guessed).
-- A replay (installments with these ids are already there) returns the credit without writing; rows sent without ids
-- are caught by the version instead: the first call bumped it, so a stale version → PT409.
create function public.replace_credit_schedule(p_credit_id uuid, p_expected_version int, p_installments jsonb)
returns public.credits
language plpgsql security definer set search_path = '' as $$
declare
  c public.credits;
begin
  select * into c from public.credits where id = p_credit_id for update;
  if not found then
    raise exception 'credit not found' using errcode = 'P0002';
  end if;
  perform private.assert_writable(c.ledger_id);
  if exists (select 1 from public.obligations o
    where o.ledger_id = c.ledger_id and o.source_type = 'credit' and o.source_id = c.id
      and o.id in (select r.id from jsonb_to_recordset(p_installments) as r (id uuid))) then
    return c;
  end if;
  if c.version is distinct from p_expected_version then
    raise exception 'credit was changed by someone else' using errcode = 'PT409';
  end if;
  if c.status <> 'active' then
    raise exception 'credit is %', c.status using errcode = '22023';
  end if;
  perform private.replace_installments(c, coalesce(p_installments, '[]'));
  update public.credits set updated_at = now() where id = c.id returning * into c;
  return c;
end $$;

-- The debt's one active obligation for what is still owed (§10: a debt with a due date is a planned payment; owed to
-- me = expected inflow 'in', I owe = 'out'). Planned = principal minus the repayments that did not pay this obligation,
-- so a linked repayment shows as its payment (paid/partial) and an unlinked one lowers the plan. No due date, a debt
-- that is not open, or nothing left: the obligation is cancelled (its payments stay as history).
create function private.sync_debt_obligation(d public.debts) returns void
language plpgsql set search_path = '' as $$
declare
  ob public.obligations;
  v_planned bigint;
begin
  select * into ob from public.obligations
  where ledger_id = d.ledger_id and source_type = 'debt' and source_id = d.id and lifecycle = 'active'
  for update;
  select d.principal_minor - coalesce(sum(m.amount_minor), 0) into v_planned
  from public.debt_movements m
  where m.debt_id = d.id and m.kind = 'repayment'
    and not exists (select 1 from public.obligation_payments p
      where p.obligation_id = ob.id and p.operation_id = m.operation_id);

  if d.due_on is not null and d.status = 'open' and v_planned > 0 then
    if ob.id is null then
      insert into public.obligations (ledger_id, direction, source_type, source_id, title, occurrence_on, due_on,
        planned_amount_minor, currency, account_id)
      values (d.ledger_id, case d.direction when 'owed_to_me' then 'in' else 'out' end, 'debt', d.id, d.person,
        d.due_on, d.due_on, v_planned, d.currency, d.account_id);
    elsif (ob.due_on, ob.title, ob.planned_amount_minor, ob.currency, ob.account_id)
      is distinct from (d.due_on, d.person, v_planned, d.currency, d.account_id) then
      -- a new due date moves due_on; occurrence_on keeps the first one (§7)
      update public.obligations
      set due_on = d.due_on, title = d.person, planned_amount_minor = v_planned, currency = d.currency,
        account_id = d.account_id
      where id = ob.id;
    end if;
  elsif ob.id is not null then
    update public.obligations set lifecycle = 'cancelled' where id = ob.id;
  end if;
end $$;

-- The operation kind of a debt movement: lending or repaying moves money out, borrowing or being repaid moves it in
create function private.debt_operation_kind(p_direction text, p_movement_kind text) returns text
language sql immutable set search_path = '' as $$
  select case when (p_direction = 'owed_to_me') = (p_movement_kind = 'principal') then 'debt_out' else 'debt_in' end
$$;

revoke execute on function private.sync_debt_obligation(public.debts), private.debt_operation_kind(text, text)
  from public;

-- Creates a debt (§10) or edits one. Create: p_debt without 'version'; a replay returns the row. origin
-- new_movement needs p_operation (the money that moves now: kind debt_out/debt_in, the debt's amount and currency,
-- no category; never income or expense); existing_no_movement and purchase_share take none. A purchase share is owed to
-- me, in the purchase currency, within the purchase amount, and points at an expense of the space. The principal is
-- the first movement. Edit: carries the version (stale → PT409) and changes person, reason, account, due date, status
-- and note only; amounts change through movements. The obligation follows (private.sync_debt_obligation).
create function public.save_debt(p_debt jsonb, p_operation jsonb default null) returns public.debts
language plpgsql security definer set search_path = '' as $$
declare
  v public.debts := jsonb_populate_record(null::public.debts, p_debt);
  d public.debts;
  op public.operations;
  v_share public.operations;
begin
  perform private.assert_writable(v.ledger_id);
  select * into d from public.debts where id = v.id for update;
  if found then
    if d.ledger_id <> v.ledger_id then
      raise exception 'debt id is taken' using errcode = '23505';
    end if;
    if not p_debt ? 'version' then
      return d;
    end if;
    if d.version is distinct from v.version then
      raise exception 'debt was changed by someone else' using errcode = 'PT409';
    end if;
    v := jsonb_populate_record(d, p_debt);
    update public.debts set (person, reason, account_id, due_on, status, note)
      = (v.person, v.reason, v.account_id, v.due_on, v.status, v.note)
    where id = d.id
    returning * into d;
    perform private.sync_debt_obligation(d);
    return d;
  end if;

  v.origin := coalesce(v.origin, 'new_movement');
  if (v.origin = 'new_movement') <> (p_operation is not null) then
    raise exception 'only a new movement comes with an operation' using errcode = '22023';
  end if;
  if v.origin = 'purchase_share' then
    select * into v_share from public.operations where id = v.share_of_operation_id and ledger_id = v.ledger_id;
    if not found or v_share.kind <> 'expense' or v.direction <> 'owed_to_me' or v_share.currency <> v.currency
      or v.principal_minor > v_share.amount_minor then
      raise exception 'a purchase share is owed to me, in the purchase currency and within its amount'
        using errcode = '22023';
    end if;
  end if;
  if p_operation is not null then
    op := public.create_operation(p_operation || jsonb_build_object('ledger_id', v.ledger_id,
      'kind', private.debt_operation_kind(v.direction, 'principal'), 'amount_minor', v.principal_minor,
      'currency', v.currency, 'category_id', null));
  end if;

  insert into public.debts (id, ledger_id, direction, person, reason, principal_minor, currency, arisen_on,
    account_id, due_on, origin, share_of_operation_id, status, note)
  values (v.id, v.ledger_id, v.direction, v.person, v.reason, v.principal_minor, v.currency,
    coalesce(v.arisen_on, op.occurred_on), coalesce(v.account_id, op.account_id), v.due_on, v.origin,
    v.share_of_operation_id, coalesce(v.status, 'open'), v.note)
  returning * into d;
  insert into public.debt_movements (ledger_id, debt_id, kind, operation_id, amount_minor, occurred_on)
  values (d.ledger_id, d.id, 'principal', op.id, d.principal_minor, coalesce(op.occurred_on, d.arisen_on));
  perform private.sync_debt_obligation(d);
  return d;
end $$;

-- A (partial) repayment (§10): p_movement = {id, debt_id, amount_minor (debt currency), occurred_on (when there is no
-- operation)}; kind is always 'repayment', the principal is written once by save_debt. With p_operation the money moves
-- now: the server sets kind debt_in/debt_out, the amount and the debt currency, no category, so it changes the balance
-- and is never income or expense. More than is owed is kept as an overpayment, as debtBalance in debts.utils shows it.
-- A repayment with money pays the debt's obligation, so the calendar shows one entry (§18). A replay returns the
-- movement, nothing written.
create function public.add_debt_movement(p_movement jsonb, p_operation jsonb default null)
returns public.debt_movements
language plpgsql security definer set search_path = '' as $$
declare
  v public.debt_movements := jsonb_populate_record(null::public.debt_movements, p_movement);
  d public.debts;
  m public.debt_movements;
  op public.operations;
  ob public.obligations;
begin
  select * into d from public.debts where id = v.debt_id for update;
  if not found then
    raise exception 'debt not found' using errcode = 'P0002';
  end if;
  perform private.assert_writable(d.ledger_id);
  select * into m from public.debt_movements where id = v.id;
  if found then
    if m.debt_id <> d.id then
      raise exception 'movement id is taken' using errcode = '23505';
    end if;
    return m;
  end if;
  if d.status <> 'open' then
    raise exception 'debt is %', d.status using errcode = '22023';
  end if;
  v.kind := 'repayment';

  if p_operation is not null then
    op := public.create_operation(p_operation || jsonb_build_object('ledger_id', d.ledger_id,
      'kind', private.debt_operation_kind(d.direction, v.kind), 'amount_minor', v.amount_minor,
      'currency', d.currency, 'category_id', null));
    v.occurred_on := op.occurred_on;
  end if;
  insert into public.debt_movements (id, ledger_id, debt_id, kind, operation_id, amount_minor, occurred_on)
  values (v.id, d.ledger_id, d.id, v.kind, op.id, v.amount_minor, v.occurred_on)
  returning * into m;

  if op.id is not null then
    select * into ob from public.obligations
    where ledger_id = d.ledger_id and source_type = 'debt' and source_id = d.id and lifecycle = 'active'
    for update;
    if found then
      insert into public.obligation_payments (ledger_id, obligation_id, operation_id, amount_minor, operation_amount_minor)
      values (d.ledger_id, ob.id, op.id, v.amount_minor, op.amount_minor);
      update public.obligations set updated_at = now() where id = ob.id;
    end if;
  end if;
  perform private.sync_debt_obligation(d);
  return m;
end $$;

revoke execute on function public.upsert_series_obligations(text, uuid, jsonb, date),
  public.set_subscription_price(jsonb), public.save_credit(jsonb, jsonb),
  public.replace_credit_schedule(uuid, int, jsonb), public.save_debt(jsonb, jsonb),
  public.add_debt_movement(jsonb, jsonb) from public, anon;
grant execute on function public.upsert_series_obligations(text, uuid, jsonb, date),
  public.set_subscription_price(jsonb), public.save_credit(jsonb, jsonb),
  public.replace_credit_schedule(uuid, int, jsonb), public.save_debt(jsonb, jsonb),
  public.add_debt_movement(jsonb, jsonb) to authenticated;
