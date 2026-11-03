-- Currency rates (Maxim, 3.11, Figma section «F1 currency rates» 50:120346): the daily cron stores every currency NBU
-- publishes, not only the three a space may hold, and every member pins up to three of them for the Overview.

-- Any ISO 4217 code in fx_rates; the currencies an account may hold keep their own list (accounts_currency_check)
alter table public.fx_rates
  drop constraint fx_rates_base_currency_check,
  drop constraint fx_rates_quote_currency_check,
  add constraint fx_rates_base_currency_check check (base_currency ~ '^[A-Z]{3}$'),
  add constraint fx_rates_quote_currency_check check (quote_currency ~ '^[A-Z]{3}$');

-- The rates a member sees on the Overview: a view preference, so per member and per space
alter table public.ledger_members
  add column pinned_currencies text[] not null default '{USD,EUR}'
    constraint ledger_members_pinned_currencies_check check (cardinality(pinned_currencies) <= 3);

-- The caller's own pins in a space, null for a non-member: the client reads them without knowing its user id
create function public.my_pinned_currencies(p_ledger_id uuid) returns text[]
language sql stable set search_path = '' as $$
  select pinned_currencies from public.ledger_members
  where ledger_id = p_ledger_id and user_id = (select auth.uid())
$$;
revoke execute on function public.my_pinned_currencies(uuid) from public, anon;
grant execute on function public.my_pinned_currencies(uuid) to authenticated;

-- Every member, a viewer included, sets their own pins. An RPC for the same reason as set_my_display_name: the column
-- grant on ledger_members includes role. Distinct ISO codes, at most three; an empty array shows no rates.
create function public.set_my_pinned_currencies(p_ledger_id uuid, p_currencies text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_currencies is null or cardinality(p_currencies) > 3 then
    raise exception 'at most 3 pinned currencies' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_currencies) as code where code is null or code !~ '^[A-Z]{3}$')
    or cardinality(p_currencies) <> (select count(distinct code) from unnest(p_currencies) as code) then
    raise exception 'a pinned currency is not a distinct ISO 4217 code' using errcode = '22023';
  end if;
  update public.ledger_members set pinned_currencies = p_currencies
  where ledger_id = p_ledger_id and user_id = auth.uid();
  if not found then
    raise exception 'not a member of this space' using errcode = '42501';
  end if;
end $$;
revoke execute on function public.set_my_pinned_currencies(uuid, text[]) from public, anon;
grant execute on function public.set_my_pinned_currencies(uuid, text[]) to authenticated;
