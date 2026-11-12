-- Operations that paid a plan before 20261111231337 have no payee, and a paid credit installment no category (QA
-- 12.11): each takes its plan's title as the counterparty and, for a credit installment, the space's system «Credits».
-- Only empty values are filled: a counterparty or category someone set is never overwritten, so a second run changes
-- nothing; bump_version raises version and updated_at of every row it fills. When one operation paid several plans,
-- the first payment's plan names it. A function so the pgTAP test can run it on prepared rows.
create function private.fill_plan_payment_operations() returns void
language sql security definer set search_path = '' as $$
  with paid as (
    select distinct on (p.operation_id) p.operation_id, o.title, c.id as credits_id
    from public.obligation_payments p
    join public.obligations o on o.id = p.obligation_id
    left join public.categories c on c.ledger_id = o.ledger_id and c.system_key = 'credits' and o.source_type = 'credit'
    order by p.operation_id, p.created_at, p.id
  )
  update public.operations op
  set counterparty = coalesce(op.counterparty, paid.title),
    category_id = coalesce(op.category_id, case when op.category_kind = 'expense' then paid.credits_id end)
  from paid
  where op.id = paid.operation_id
    and (op.counterparty is null
      or (op.category_id is null and op.category_kind = 'expense' and paid.credits_id is not null));
$$;
revoke execute on function private.fill_plan_payment_operations() from public;

select private.fill_plan_payment_operations();
