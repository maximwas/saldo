# Патерни Next.js 16 + Supabase + TanStack Query (дослідження 30.10.2026)

Reddit/HN не перевірено; решта — офіційні доки, блог TkDodo, GitHub.

## Next.js 16.x (остання 16.4, 06.10.2026)
- `proxy.ts` замість `middleware.ts`, Node runtime; лише оптимістичні перевірки за cookie.
  https://nextjs.org/docs/app/getting-started/proxy
- Turbopack за замовчуванням; `next lint` прибрано — Biome підходить. https://nextjs.org/blog/next-16
- `typedRoutes: true` stable. React Compiler stable, але вимкнений за замовчуванням (повільніша збірка).
- Cache Components рекомендовані з 16.4 (у create-next-app увімкнені). Для per-user даних `use cache`
  майже марний; сесію читати в `<Suspense>`. Беремо заради статичної оболонки PWA, гроші — лише через
  клієнтський Query. https://nextjs.org/docs/app/guides/authentication-with-cache-components
- Server Actions — публічні POST, виконуються по одній; не для офлайн-черги.
  https://nextjs.org/docs/app/getting-started/mutating-data
- Офлайн: дока радить Serwist. https://nextjs.org/docs/app/guides/progressive-web-apps

## Спайк Serwist на Next 16.4 (0.16, 30.10.2026) — працює

- Пакети: `@serwist/turbopack` 9.5.13 і `serwist` 9.5.13 (MIT, 04.10.2026), `esbuild` 0.28.2 (dev, для
  `useNativeEsbuild: true`). Дока: https://serwist.pages.dev/docs/next/turbo
- Файли: `next.config.ts` → `withSerwist(nextConfig)`; `src/app/serwist/[path]/route.ts` → `createSerwistRoute({ swSrc:
  'src/app/sw.ts', useNativeEsbuild: true })`; `src/app/sw.ts` (`Serwist` + `defaultCache`, `skipWaiting`,
  `clientsClaim`, `navigationPreload`); `SerwistProvider swUrl="/serwist/sw.js"` у `(app)/layout.tsx`, вимкнений у dev.
- Пастка з `cacheComponents`: `createSerwistRoute` повертає ще й `dynamic`, `revalidate`, `dynamicParams`, а Next 16 з
  `cacheComponents` такі segment config не приймає. Тому з маршруту експортуються лише `generateStaticParams` і `GET`.
  Маршрут у build — `ƒ /serwist/[path]` (рендер на запит), а не статичний.
- Перевірка (`pnpm build` + `next start`, Playwright): SW `/serwist/sw.js` активний і контролює сторінку, 17 записів
  precache (976 KiB). Офлайн відкриваються відвідані сторінки (`/`, `/calendar`) з оболонкою; невідвідані (`/more`,
  `/budget`) — `net::ERR_FAILED`.
- Далі (фаза 8): сторінка `/~offline` як fallback для `destination: 'document'` і precache оболонки
  (`additionalPrecacheEntries` з ревізією), стратегія для RSC-запитів, оновлення SW без розриву сесії.

## Supabase + Next
- `@supabase/supabase-js` + `@supabase/ssr`; env `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Токени оновлювати лише в `proxy.ts`.
  https://supabase.com/docs/guides/auth/server-side/nextjs
- `getClaims()` (перевіряє підпис JWT) для DAL і proxy; `getSession()` на сервері не довіряти.
- RLS — справжня межа безпеки; клієнт без сесії отримує порожній масив, а не помилку.
- Типи: `supabase gen types typescript --local > src/types/database.types.ts`.

## TanStack Query v5
- `getQueryClient()` у `'use client'` файлі; `staleTime` > 0.
  https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
- `queryOptions` + фабрика ключів разом; `useQuery(subscriptionQueries.list())` без обгорток.
  https://tkdodo.eu/blog/the-query-options-api · https://tkdodo.eu/blog/effective-react-query-keys
- Мутації: інвалідацію повертати з `useMutation`; оптимістично — лише тогли.
  https://tkdodo.eu/blog/mastering-mutations-in-react-query
- Офлайн: `PersistQueryClientProvider` + IndexedDB (`idb-keyval`), `gcTime >= maxAge`, `buster` = версія схеми.
  Мутації після reload: `setMutationDefaults(key, { mutationFn, ... })` ДО гідрації, потім
  `resumePausedMutations()`; повтор іде з нуля → UUID клієнта = ключ ідемпотентності, RPC робить
  `on conflict do nothing`; `scope.id` для черги по порядку.
  https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient ·
  https://github.com/TanStack/query/discussions/7355
- Перевірити спайком: `networkMode: 'offlineFirst'` після reload.

## Суфікси в стилі NestJS
- Приклади: https://github.com/just-jeb/react-typescript-styleguide (`[name].[type].[ext]`).
  Bulletproof-react суфіксів не має, але kebab-case, без barrel, фічі не імпортують одна одну.
- Reserved-файли Next (`page`, `layout`, `route`, `loading`, `error`, `not-found`, `proxy`,
  `manifest`) — без суфіксів. `"use client"` пишеться у файлі, суфікс його не замінює.

## Стан і форми
- Query — server state; Zustand — UI state; nuqs — URL (фільтри); Context — лише DI.
  https://tkdodo.eu/blog/zustand-and-react-context
- RHF + `zodResolver` (zod 4 потребує `@hookform/resolvers` >= 5.1); серверні помилки через `setError`;
  у `.refine` завжди `path`. Postgres `23505` → поле через словник constraint → field.
- Межі фіч: Biome `noRestrictedImports` лише через overrides на кожну фічу (громіздко) →
  беремо dependency-cruiser з одним правилом.

## Тести (Vitest, unit)
- Тестувати: гроші, recurrence, резерви/доступно, податкові розрахунки, zod-схеми, мапінг помилок.
- Не тестувати: async Server Components, виклики supabase, розмітку shadcn.
  https://nextjs.org/docs/app/guides/testing/vitest
