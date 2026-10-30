-- Reminders and notifications of phase 3 (docs/architecture.md §5.8, spec §19, §24, §25): reminder_rules of a
-- space, personal notifications and push subscriptions, the service-role-only due_reminder_fires and the pg_cron job
-- that calls /api/cron/reminders.

-- One rule per payment source, shared by the space; who receives it is each member's ledger_members.notify_channels.
create table public.reminder_rules (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  -- a series (every obligation of one subscription, credit or debt) or one obligation by its id
  source_type text not null constraint reminder_rules_source_type_check
    check (source_type in ('subscription', 'credit', 'debt', 'obligation')),
  source_id uuid not null, -- polymorphic as obligations.source_id: sources are archived, not deleted
  -- days before due_on, 0 = on the day (§25: subscriptions {3,2}, credits {0})
  offsets_days int[] not null constraint reminder_rules_offsets_check
    check (cardinality(offsets_days) between 1 and 5 and 0 <= all (offsets_days) and 60 >= all (offsets_days)),
  at_time time not null default '09:00', -- local time in the space's time zone (ledgers.time_zone)
  channels text[] not null default '{in_app,push}' constraint reminder_rules_channels_check
    check (cardinality(channels) > 0 and channels <@ '{in_app,push}'),
  custom_text text constraint reminder_rules_custom_text_length check (char_length(custom_text) <= 200),
  stop_when_paid boolean not null default true, -- §24: a paid obligation gets no more reminders
  enabled boolean not null default true,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  constraint reminder_rules_source_unique unique (ledger_id, source_type, source_id)
);
create index reminder_rules_created_by_idx on public.reminder_rules (created_by);

create trigger reminder_rules_bump_version before update on public.reminder_rules
  for each row execute function private.bump_version();
create trigger reminder_rules_keep_created_by before update on public.reminder_rules
  for each row execute function private.keep_created_by();

-- Personal: each member has own notifications and own read state. Written only by the cron route (service role).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  ledger_id uuid not null references public.ledgers on delete cascade,
  reminder_rule_id uuid references public.reminder_rules on delete set null,
  obligation_id uuid,
  -- '{rule}:{occurrence_on}:{due_on}:{days_before}': a repeated cron run inserts nothing; a moved payment is reminded
  -- again, a credit schedule rewritten with the same dates is not
  fire_key text not null,
  title text not null,
  body text not null,
  link_path text,
  read_at timestamptz,
  -- push delivery; null = no push for this one (push channel off or VAPID keys not set)
  delivery_status text constraint notifications_delivery_status_check
    check (delivery_status in ('pending', 'sent', 'failed', 'no_subscription')),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_fire_unique unique (user_id, fire_key),
  constraint notifications_obligation_fkey foreign key (ledger_id, obligation_id)
    references public.obligations (ledger_id, id) on delete set null (obligation_id)
);
create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);
create index notifications_ledger_id_obligation_id_idx on public.notifications (ledger_id, obligation_id);
create index notifications_reminder_rule_id_idx on public.notifications (reminder_rule_id);

-- A device belongs to a person, not a space: push from all of their spaces goes to the same devices. One endpoint has
-- one owner; signing out removes the device's row (architecture §8), then the next person on it can subscribe.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  -- the server POSTs to it: only https push services, never an arbitrary scheme
  endpoint text not null constraint push_subscriptions_endpoint_key unique
    constraint push_subscriptions_endpoint_https check (endpoint like 'https://%'),
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.reminder_rules enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

create policy reminder_rules_read on public.reminder_rules for select to authenticated
  using (ledger_id in (select private.my_ledger_ids()));
create policy reminder_rules_write on public.reminder_rules for all to authenticated
  using (ledger_id in (select private.my_writable_ledger_ids()))
  with check (ledger_id in (select private.my_writable_ledger_ids()));
-- a member who left the space no longer sees what came from it
create policy notifications_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) and ledger_id in (select private.my_ledger_ids()));
create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = (select auth.uid()) and ledger_id in (select private.my_ledger_ids()))
  with check (user_id = (select auth.uid()) and ledger_id in (select private.my_ledger_ids()));
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on table public.reminder_rules, public.notifications, public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on table public.reminder_rules to authenticated;
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated; -- «read» only; the rest is the server's
grant select, insert, update, delete on table public.push_subscriptions to authenticated;

-- §25 defaults on a new subscription, credit or debt: subscriptions 3 and 2 days before, credits on the due day only,
-- debts none. ledgers.reminder_defaults ({"subscription": [3, 2], "credit": [0]}) overrides them per source type;
-- changing the defaults later does not rewrite existing rules (§8). Security definer: the source row already passed
-- its own checks, and the RPCs that insert credits and debts run as definer too.
create function private.add_default_reminder() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.reminder_rules (ledger_id, source_type, source_id, offsets_days)
  select new.ledger_id, tg_argv[0], new.id, array(select jsonb_array_elements_text(d.offsets)::int)
  from public.ledgers l
  cross join lateral (
    select coalesce(l.reminder_defaults -> tg_argv[0], '{"subscription": [3, 2], "credit": [0]}'::jsonb -> tg_argv[0])
      as offsets
  ) d
  where l.id = new.ledger_id and jsonb_typeof(d.offsets) = 'array' and d.offsets <> '[]'::jsonb
  on conflict do nothing;
  return null;
end $$;
revoke execute on function private.add_default_reminder() from public;

create trigger subscriptions_default_reminder after insert on public.subscriptions
  for each row execute function private.add_default_reminder('subscription');
create trigger credits_default_reminder after insert on public.credits
  for each row execute function private.add_default_reminder('credit');
create trigger debts_default_reminder after insert on public.debts
  for each row execute function private.add_default_reminder('debt');

-- sources created before this migration get the same §25 defaults (no space sets reminder_defaults yet)
insert into public.reminder_rules (ledger_id, source_type, source_id, offsets_days)
select ledger_id, 'subscription', id, '{3,2}'::int[] from public.subscriptions where archived_at is null
union all
select ledger_id, 'credit', id, '{0}'::int[] from public.credits where status = 'active';

-- «Reminders of this space to me» (Access): every member, the owner included, sets their own channels; an empty array
-- turns them off. An RPC for the same reason as set_my_display_name: the column grant on ledger_members includes role.
create function public.set_my_notify_channels(p_ledger_id uuid, p_channels text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_channels is null or not p_channels <@ array['in_app', 'push'] then
    raise exception 'unknown notification channel' using errcode = '22023';
  end if;
  update public.ledger_members set notify_channels = p_channels
  where ledger_id = p_ledger_id and user_id = auth.uid();
  if not found then
    raise exception 'not a member of this space' using errcode = '42501';
  end if;
end $$;
revoke execute on function public.set_my_notify_channels(uuid, text[]) from public, anon;
grant execute on function public.set_my_notify_channels(uuid, text[]) to authenticated;

-- Reminders due by p_now, one row per member whose notify_channels meet the rule's channels (§19, plan 3.8). A fire
-- is due when due_on − days_before at the rule's at_time in the space's time zone is ≤ p_now and at most a day old
-- (a cron outage is caught up, a new rule does not replay the past). Only active obligations; with stop_when_paid
-- none that are paid (§24). Fires a member already has a notification for are left out; the route's
-- insert … on conflict (user_id, fire_key) do nothing still guards two overlapping runs.
-- Invoker: only service_role executes it, and it bypasses RLS.
create function public.due_reminder_fires(p_now timestamptz)
returns table (
  fire_key text,
  user_id uuid,
  ledger_id uuid,
  reminder_rule_id uuid,
  obligation_id uuid,
  direction text,
  title text,
  due_on date,
  days_before int,
  amount_minor bigint, -- what is left to pay; null = unknown amount (§7)
  currency text,
  custom_text text,
  channels text[],
  locale text
)
language sql stable set search_path = '' as $$
  with fires as (
    select r.id || ':' || s.occurrence_on || ':' || s.due_on || ':' || d.days_before as fire_key,
      r.id as rule_id, r.ledger_id, r.channels, r.custom_text, s.obligation_id, s.direction, s.title, s.due_on,
      d.days_before, s.remaining_minor, s.currency
    from public.reminder_rules r
    join public.ledgers l on l.id = r.ledger_id
    join public.obligation_states s on s.ledger_id = r.ledger_id
      and ((r.source_type = 'obligation' and s.obligation_id = r.source_id)
        or (s.source_type = r.source_type and s.source_id = r.source_id))
    cross join lateral unnest(r.offsets_days) d(days_before)
    cross join lateral (select ((s.due_on - d.days_before) + r.at_time) at time zone l.time_zone as fire_at) t
    where r.enabled
      and s.lifecycle = 'active'
      and (s.state <> 'paid' or not r.stop_when_paid)
      and s.due_on between (p_now - interval '2 days')::date and (p_now + interval '62 days')::date
      and t.fire_at <= p_now
      and t.fire_at > p_now - interval '1 day'
  )
  select f.fire_key, m.user_id, f.ledger_id, f.rule_id, f.obligation_id, f.direction, f.title, f.due_on, f.days_before,
    f.remaining_minor, f.currency, f.custom_text, c.channels, us.locale
  from fires f
  join public.ledger_members m on m.ledger_id = f.ledger_id
  left join public.user_settings us on us.user_id = m.user_id
  cross join lateral (
    select array(select unnest(f.channels) intersect select unnest(m.notify_channels)) as channels
  ) c
  where cardinality(c.channels) > 0
    and not exists (select 1 from public.notifications n where n.user_id = m.user_id and n.fire_key = f.fire_key)
$$;
revoke execute on function public.due_reminder_fires(timestamptz) from public, anon, authenticated;
grant execute on function public.due_reminder_fires(timestamptz) to service_role;

-- Every 10 minutes pg_net calls /api/cron/reminders of this environment. The URL and the secret live in Vault, never
-- in the repository: a database without both secrets (local, preview, a fresh production) sends nothing, so no
-- environment can call another one. Release step (docs/architecture.md §7): vault.create_secret('<site>/api/cron/
-- reminders', 'reminders_cron_url') and vault.create_secret('<CRON_SECRET>', 'cron_secret').
select cron.schedule('reminders', '*/10 * * * *', $job$
  select net.http_post(
    url := u.decrypted_secret,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
    timeout_milliseconds := 30000
  )
  from vault.decrypted_secrets u, vault.decrypted_secrets s
  where u.name = 'reminders_cron_url' and s.name = 'cron_secret'
$job$);
