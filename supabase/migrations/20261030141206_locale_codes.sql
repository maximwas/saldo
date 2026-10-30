-- user_settings.locale holds next-intl locale codes (uk, en), not BCP 47 regions: src/i18n/locale.utils.ts.
-- Existing rows keep their language; anything else becomes the default uk.
update public.user_settings
set locale = case when locale like 'en%' then 'en' else 'uk' end
where locale not in ('uk', 'en');

alter table public.user_settings
  alter column locale set default 'uk',
  add constraint user_settings_locale_check check (locale in ('uk', 'en'));
