-- Local dev seed, run by `supabase db reset` after the migrations (config.toml [db.seed]); never pushed to a remote
-- project. Fictional data of docs/design/demo-data.md only (ADR 22: the repository is public): one demo user with its
-- space as of 30.10.2026 — accounts, rates, subscriptions, credits, debts and planned payments. Every story date is
-- shifted by v_shift days so that 30.10.2026 is today in Kyiv and the demo never goes stale; the setting
-- saldo.demo_today = 'YYYY-MM-DD' pins today (the visual specs need 2026-10-30, the day of the Figma frames). The
-- monthly household bills follow the current Kyiv month instead, like the operations of scripts/seed-visual.mjs.
-- Sign in locally as demo@example.com / saldo-demo-local-password (a local stack only, so not a secret).
-- Subscriptions, credits and debts go through the phase 2 RPCs as the demo user, the way the app writes them; the
-- installments paid before tracking (paid_before_tracking_count) get no operations, the debts are old ones without a
-- movement, so the account balances stay the ones of demo-data.md.
do $$
declare
  v_user uuid := 'de000000-0000-4000-8000-000000000001';
  v_ledger uuid;
  v_today date := coalesce(nullif(current_setting('saldo.demo_today', true), '')::date,
    (now() at time zone 'Europe/Kyiv')::date);
  v_shift int := v_today - date '2026-10-30';
  v_card uuid := 'de000000-0000-4000-8000-0000000000a1';
  v_subscriptions uuid;
  c record;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated', 'demo@example.com',
    extensions.crypt('saldo-demo-local-password', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_user, v_user::text,
    jsonb_build_object('sub', v_user::text, 'email', 'demo@example.com', 'email_verified', true), 'email', now(), now(), now());

  -- the RPCs check the caller like a request from the app would
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  select last_ledger_id into v_ledger from public.user_settings where user_id = v_user;
  update public.ledgers set name = 'Мій Saldo', next_income_on = date '2026-11-14' + v_shift where id = v_ledger;
  update public.ledger_members set display_name = 'Максим' where ledger_id = v_ledger and user_id = v_user;
  select id into v_subscriptions from public.categories where ledger_id = v_ledger and name = 'Підписки';
  -- not a standard category; the mobile bill below takes it
  insert into public.categories (id, ledger_id, kind, name, color, sort_order)
  values ('de000000-0000-4000-8000-000000000902', v_ledger, 'expense', 'Зв''язок', 'teal', 13);

  insert into public.accounts (id, ledger_id, name, kind, currency, opening_balance_minor, opening_balance_on,
    include_in_available, sort_order) values
    (v_card, v_ledger, 'Основна картка', 'bank', 'UAH', 4621580, date '2026-10-30' + v_shift, true, 1),
    ('de000000-0000-4000-8000-0000000000a3', v_ledger, 'Валютний EUR', 'savings', 'EUR', 120000, date '2026-10-30' + v_shift, false, 3);
  insert into public.fx_rates (ledger_id, base_currency, quote_currency, rate, rate_on) values
    (v_ledger, 'EUR', 'UAH', 41.5, date '2026-10-01' + v_shift),
    (v_ledger, 'USD', 'UAH', 41.6, date '2026-10-01' + v_shift),
    (v_ledger, 'EUR', 'UAH', 41.5, date '2026-10-30' + v_shift);
  -- NBU rates of the day before and of today (Figma section «F1 currency rates» 50:120346), so the day's change shows; today's
  -- manual EUR rate above beats NBU's 41,38
  insert into public.fx_rates (ledger_id, base_currency, quote_currency, rate, rate_on, source, source_name)
  select v_ledger, x.code, 'UAH', d.rate, date '2026-10-30' + v_shift - d.back, 'reference', 'nbu'
  from (values
    ('USD', 41.60, 41.48),
    ('EUR', 41.38, 41.44),
    ('PLN', 9.65, 9.68),
    ('GBP', 48.80, 48.59),
    ('CHF', 44.10, 44.05),
    ('CZK', 1.66, 1.66),
    ('CAD', 30.14, 30.21)
  ) as x (code, today_rate, yesterday_rate)
  cross join lateral (values (0, x.today_rate), (1, x.yesterday_rate)) as d (back, rate);

  -- subscriptions, a year of dates from the story's November
  for c in select * from (values
    ('de000000-0000-4000-8000-0000000000b1'::uuid, 'Netflix', 'UAH', 34900::bigint, '2026-01-05'::date, '2026-11-05'::date),
    ('de000000-0000-4000-8000-0000000000b2'::uuid, 'Spotify', 'UAH', 19900::bigint, '2026-01-12'::date, '2026-11-12'::date),
    ('de000000-0000-4000-8000-0000000000b3'::uuid, 'Google One', 'USD', 299::bigint, '2026-01-22'::date, '2026-11-22'::date)
  ) as x (id, name, currency, amount_minor, first_on, next_on)
  loop
    insert into public.subscriptions (id, ledger_id, name, category_id, account_id, currency, first_on)
    values (c.id, v_ledger, c.name, v_subscriptions, v_card, c.currency, c.first_on + v_shift);
    perform public.set_subscription_price(jsonb_build_object('id', gen_random_uuid(), 'subscription_id', c.id,
      'effective_on', c.first_on + v_shift, 'amount_minor', c.amount_minor));
    perform public.upsert_series_obligations('subscription', c.id,
      (select jsonb_agg(jsonb_build_object('due_on', (c.next_on + v_shift + make_interval(months => n))::date))
       from generate_series(0, 11) n));
  end loop;

  -- credits: estimated schedules, the installments paid before tracking have no rows and no operations
  for c in select * from (values
    ('Comfy — ноутбук', 'Comfy', 3249900::bigint, 270825::bigint, null::bigint, 12, 3, '2026-11-05'::date),
    ('Епіцентр — пральна машина', 'Епіцентр', 1499900, 124992, 124988, 12, 5, '2026-11-12'),
    ('Цитрус — смартфон', 'Цитрус', 1899900, 158325, null, 12, 2, '2026-10-30'),
    ('Rozetka — пилосос', 'Rozetka', 649900, 64990, null, 10, 4, '2026-10-20'),
    ('Алло — навушники', 'Алло', 999900, 83325, null, 12, 1, '2026-11-25')
  ) as x (name, lender, price_minor, regular_minor, last_minor, installments, paid, next_on)
  loop
    perform public.save_credit(
      jsonb_build_object('id', gen_random_uuid(), 'ledger_id', v_ledger, 'name', c.name, 'lender', c.lender,
        'purchase_price_minor', c.price_minor, 'total_payable_minor', c.price_minor, 'currency', 'UAH',
        'installments_count', c.installments, 'regular_installment_minor', c.regular_minor,
        'last_installment_minor', c.last_minor, 'account_id', v_card, 'schedule_accuracy', 'estimated',
        'paid_before_tracking_count', c.paid, 'paid_before_tracking_minor', c.paid * c.regular_minor),
      (select jsonb_agg(jsonb_build_object('sequence_no', n,
         'due_on', (c.next_on + v_shift + make_interval(months => n - c.paid - 1))::date,
         'amount_minor', case when n = c.installments and c.last_minor is not null then c.last_minor else c.regular_minor end))
       from generate_series(c.paid + 1, c.installments) n));
  end loop;

  -- personal debts, all old ones without a movement now
  perform public.save_debt(jsonb_build_object('id', gen_random_uuid(), 'ledger_id', v_ledger, 'direction', d.direction,
    'person', d.person, 'reason', d.reason, 'principal_minor', d.amount_minor, 'currency', 'UAH',
    'arisen_on', date '2026-10-01' + v_shift, 'due_on', d.due_on + v_shift, 'origin', 'existing_no_movement'))
  from (values
    ('owed_to_me', 'Андрій', 'Позика', 350000::bigint, '2026-11-15'::date),
    ('owed_to_me', 'Ірина', 'Частка вечері', 120000, null),
    ('i_owe', 'Тарас', null, 200000, '2026-11-20')
  ) as d (direction, person, reason, amount_minor, due_on);

  -- planned payments (source_type 'manual', one row a month): the household's bills on their day of the current Kyiv
  -- month and the next 11. This month's rent, mobile, utilities and gym are paid by their operations in
  -- scripts/seed-visual.mjs (this file has no operations), so they start next month here; this month's insurance is
  -- overdue, two days before today at the latest. The internet bill keeps its story date, 10.11 + v_shift.
  insert into public.obligations (ledger_id, title, occurrence_on, due_on, planned_amount_minor, currency, account_id,
    category_id)
  select v_ledger, p.title, x.due_on, x.due_on, p.amount_minor, 'UAH', v_card, cat.id
  from (values
    ('Оренда квартири', 'Житло', 1400000::bigint, 1, 1),
    ('Kyivstar', 'Зв''язок', 25000, 15, 1),
    ('Комунальні платежі', 'Житло', 230000, 19, 1),
    ('Фітнес-клуб', 'Здоров''я', 110000, 24, 1),
    ('Медична страховка', 'Здоров''я', 45000, 28, 0)
  ) as p (title, category, amount_minor, day_no, first_month)
  join public.categories cat on cat.ledger_id = v_ledger and cat.kind = 'expense' and cat.name = p.category
  cross join lateral generate_series(p.first_month, 11) n
  cross join lateral (select (date_trunc('month', v_today::timestamp)
    + make_interval(months => n, days => p.day_no - 1))::date) m (on_day)
  cross join lateral (select case when n = 0 then least(m.on_day, v_today - 2) else m.on_day end) x (due_on)
  union all
  select v_ledger, 'Інтернет', x.due_on, x.due_on, 35000, 'UAH', v_card, null
  from generate_series(0, 11) n
  cross join lateral (select (date '2026-11-10' + v_shift + make_interval(months => n))::date) x (due_on);
end $$;
