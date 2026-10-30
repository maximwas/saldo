# Спільний доступ: простори, ролі, RLS (дослідження 30.10.2026)

Рішення Максима 30.10.2026: у кожного свій приватний простір, власник шарить його з роллю editor або viewer,
може відкликати; людина буває в кількох просторах. Реалізація — `docs/architecture.md` ADR 19–21, §3.8, §5.0.

## Модель: варіанти

| Варіант | Плюси | Мінуси | Вибір |
|---|---|---|---|
| Простір (ledger) + членство з роллю, усі дані з `ledger_id` | одна межа RLS; «Доступно» однакове для всіх учасників; приватне = окремий простір; модель YNAB shared budgets і basejump «personal + team accounts» | `ledger_id` на кожній таблиці й у кожному запиті | **так** |
| Одна «сім'я» + прапорець `visibility` на рахунках | менше просторів | видимість успадковують операції, оплати, резерви, податки; «Доступно» різне для різних глядачів; політики на кожному рядку | ні |
| Шаринг окремих рахунків (ACL на рахунок) | найгнучкіше | те саме успадкування видимості, плюс переказ між рахунками з різним доступом | ні (питання до Максима) |
| `user_id` + список «друзів» | нічого нового в схемі | немає ролей, немає спільних налаштувань і календарів | ні |

## RLS: варіанти

| Варіант | Плюси | Мінуси | Вибір |
|---|---|---|---|
| `ledger_id in (select private.my_ledger_ids())`, функція `security definer` у схемі `private` | без рекурсії через `ledger_members`; initPlan раз на запит; відкликання діє з наступного запиту | 2–4× накладних витрат проти голої колонки (некритично на ~10 тис. рядків/рік) | **так** |
| Членство в JWT (custom access token hook) | найшвидше (≈1.2×) | доступ живе до перевипуску токена (до години) після «Відкликати»; ще один hook | ні |
| Підзапит до `ledger_members` прямо в політиці | без функцій | RLS самої `ledger_members` → рекурсія або повільні join | ні |
| `has_role(ledger_id, role)` з параметром рядка | читається гарно | не загортається в `(select …)`, рахується на кожен рядок | ні |

Правила з доків Supabase, які беремо дослівно: `(select auth.uid())`; `to authenticated` у кожній політиці;
індекси на `ledger_id` і `ledger_members(user_id)` (складений PK `(ledger_id, user_id)` не індексує `user_id`);
`security definer` лише в схемі, яку не віддає Data API, з `set search_path = ''`; явний `.eq('ledger_id', …)` у
запитах клієнта — RLS для безпеки, не для фільтра.

## Запрошення: варіанти

| Варіант | Плюси | Мінуси | Вибір |
|---|---|---|---|
| Власна `ledger_invites`, токен 32 байти, у БД SHA-256, посилання пересилає власник; акаунт — `auth.admin.createUser` у server-only лише за дійсним токеном | без SMTP; знає простір і роль; одноразовий, строк 7 днів; реєстрація лишається вимкненою | свій Route Handler і RPC | **так** |
| `auth.admin.inviteUserByEmail` (service-role, server-only) | готовий лист і magic link | вбудований SMTP шле лише адресам команди проєкту, 2 листи/год → потрібен свій SMTP; нічого не знає про простір і роль (все одно потрібна таблиця); не працює з PKCE | ні |
| Відкрита реєстрація + запит на доступ | найпростіше | будь-хто створює акаунт у фінансовому застосунку | ні |

## Готове

Беру готове: патерн basejump (особистий простір тригером на `auth.users`, таблиця членства з роллю, функції
членства в RLS) і `basejump-supabase_test_helpers` (MIT, через dbdev: `tests.create_supabase_user`,
`tests.authenticate_as`, `tests.rls_enabled`) для pgTAP; RLS-правила з доків Supabase. Сам пишу схему
`ledgers` / `ledger_members` / `ledger_invites`, три функції членства й RPC запрошень, бо basejump
не підтримується («This project is unmaintained», README) і тягне білінг Stripe, slug-и й команди, які нам не
потрібні; його міграції — лише зразок.

Перевірено: basejump — MIT, unmaintained; test helpers — MIT, версія 0.0.6, дати останнього коміту сторінка не
показує (якщо dbdev не стане — `set local role authenticated` + `request.jwt.claims` вручну, план 0.10b).
Reddit r/Supabase окремих тредів про сімейний бюджет не дав; висновки спільноти — у discussion #14576 і MakerKit.

## Джерела

- https://supabase.com/docs/guides/database/postgres/row-level-security (call functions with select, add
  indexes, specify roles, use security definer functions, avoid recursive policies)
- https://supabase.com/docs/guides/database/postgres/row-level-security-performance
- https://github.com/orgs/supabase/discussions/14576 (RLS Performance and Best Practices),
  https://github.com/GaryAustin1/RLS-Performance (заміри)
- https://github.com/usebasejump/basejump · https://github.com/usebasejump/supabase-test-helpers
- https://makerkit.dev/blog/tutorials/supabase-rls-best-practices (security definer поза exposed-схемою)
- https://www.reddit.com/r/Supabase/comments/165kbqs (multi-tenancy)
- https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail ·
  https://supabase.com/docs/guides/auth/auth-smtp (обмеження вбудованого SMTP)
- YNAB shared budgets — модель «спільний бюджет = окремий простір»
