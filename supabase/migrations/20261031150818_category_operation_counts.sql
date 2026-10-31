-- How many operations each category has: the operation-count line of the Categories page (Figma 2:49638).
-- security_invoker: RLS of operations decides what a member counts.
create view public.category_operation_counts with (security_invoker = true) as
select ledger_id, category_id, count(*)::int as operation_count
from public.operations
where category_id is not null
group by ledger_id, category_id;

revoke all on table public.category_operation_counts from anon, authenticated;
grant select on table public.category_operation_counts to authenticated;
