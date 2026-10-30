# Платформа: Supabase чи Firebase, сховище файлів, ліміти (дослідження 30.10.2026)

Джерела — офіційні сторінки цін і документації, станом на 30.10.2026. «Не перевірено» означає, що
офіційного підтвердження не знайдено.

## Рішення
- **БД: Supabase Free.** Атомарність «операція + оплата зобов'язання + резерв» — один `rpc()` у
  транзакції; CHECK, FK, UNIQUE (ключ ідемпотентності), агрегати — рідний SQL. У Firebase транзакції
  падають офлайн, сховище файлів і функції потребують Blaze з карткою.
- **Файли: Supabase Storage** (1 ГБ, файл до 50 МБ, приватний бакет + RLS + signed URL). Фото чеків
  стискаємо на клієнті. Запасні: Vercel Blob Hobby (1 ГБ, приватні), Cloudflare R2 (10 ГБ, потрібна картка).
- **Не дати проєкту заснути:** щоденний бекап у GitHub Actions і щоденний Vercel cron роблять запити до
  бази; `pg_cron` — додатково, офіційно не гарантує.
- **Бекап:** GitHub Actions за розкладом, `supabase db dump` (roles, schema, data), зашифрований
  артефакт, не в git. На Free автоматичних бекапів немає.
- **Нагадування:** `pg_cron` (кожні 5–15 хв) → `pg_net` POST → Next route `/api/cron/reminders` на Node.

## Supabase Free
- База 500 МБ, 5 ГБ egress, 50k MAU, 500k викликів Edge Functions, 2 активні проєкти.
- Storage 1 ГБ, файл до 50 МБ; image transformations лише Pro.
  https://supabase.com/pricing · https://supabase.com/docs/guides/storage/uploads/file-limits
- Пауза після 7 днів без активності; «кілька запитів на день» тримають; resume з Dashboard повертає дані
  (до року). Чи рахується pg_cron — не перевірено. https://supabase.com/docs/guides/platform/free-project-pausing
- pg_cron (до щосекунди), pg_net (лише POST JSON, beta). Доступність саме на Free — не перевірено.
  https://supabase.com/docs/guides/cron · https://supabase.com/docs/guides/database/extensions/pg_net
- Бекапи: на Free немає; офіційний гайд GitHub Actions + `supabase db dump` (тригер `schedule:` додати).
  https://supabase.com/docs/guides/deployment/ci/backups
- Auth: перемикач «Allow new users to sign up» вимикає реєстрацію (свій акаунт створити до того).
  Вбудований SMTP — 2 листи/год і лише на адреси команди організації: для одного власника вистачає.
  https://supabase.com/docs/guides/auth/general-configuration · https://supabase.com/docs/guides/auth/auth-smtp
- RLS: `using ((select auth.uid()) = user_id)` + індекс на `user_id`.
  https://supabase.com/docs/guides/database/postgres/row-level-security

## Firebase Spark (чому ні)
- Firestore: 1 GiB, 50k читань / 20k записів на день.
- Cloud Storage на Spark недоступний (з 30.10.2024 нові бакети лише на Blaze).
  https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- Транзакції: «Transactions will fail when the client is offline».
  https://firebase.google.com/docs/firestore/manage-data/transactions
- Немає join, FK, CHECK; Cloud Functions лише Blaze; відомі зависання multi-tab кешу в iOS PWA.

## Інші сховища
| Сервіс | Безкоштовно | Вердикт |
|---|---|---|
| Supabase Storage | 1 ГБ, приватні бакети, RLS | беремо |
| Vercel Blob Hobby | 1 ГБ, 10 ГБ трафіку, приватні | запасний |
| Cloudflare R2 | 10 ГБ, egress безкоштовний, картка | якщо мало 1 ГБ |
| Backblaze B2 | 10 ГБ, без картки | можливий |
| UploadThing | 2 ГБ, приватні лише платно | ні |

## Vercel Hobby
- Лише особисте некомерційне використання — Saldo підходить.
- Cron: до 100 задач, **раз на добу**, точність ±59 хв. https://vercel.com/docs/cron-jobs/usage-and-pricing
- Функції до 300 с (Fluid compute); один регіон, `regions: ["fra1"]` у vercel.json (дефолт iad1).

## Сповіщення й календарі
- Web Push iOS/iPadOS 16.4+ лише для PWA на Home Screen, дозвіл — по жесту; кожен push має показати
  сповіщення. Declarative Web Push з iOS 18.4. `web-push` — лише Node runtime; 404/410 → видалити підписку.
  https://webkit.org/blog/16535/meet-declarative-web-push/
- Google Calendar: у статусі Testing refresh token живе 7 днів → публікуємо OAuth-застосунок
  «In production» без верифікації (екран попередження, ліміт 100 користувачів; довговічність токена —
  перевірити живим тестом). `events.watch` ненадійний і потребує поновлення каналу → плюс періодичний
  sync через `syncToken` (410 → повний ресинк). Зв'язок подій — `extendedProperties.private`.
  https://developers.google.com/identity/protocols/oauth2#expiration · https://developers.google.com/workspace/calendar/api/guides/sync
- iCloud: CalDAV з app-specific password, без push (лише опитування); tsdav з
  `serverUrl: https://caldav.icloud.com/`, `defaultAccountType: "caldav"` (issue #238). Пошуку за UID немає.

## Не перевірено
Ліміт викликів функцій Vercel Hobby; Google Drive API; passkeys на Supabase Free; RRULE-винятки в iCloud;
довговічність Google refresh token у production без верифікації.
