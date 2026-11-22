# 11 — Полное удаление аккаунтов (single-workspace)

**Итог: PARTIAL.** Пользовательский UI действительно живёт без аккаунтов: вход/регистрация/приглашения/тарифы
редиректят, сайдбар и настройки очищены, все ключевые API отвечают без cookie, `typecheck` зелёный.
Но остались аккаунт-зависимые **админ-экраны** (вкладка «Пользователи»), в БД лежат 48 аккаунтов,
и весь auth-контур (login/register/guest/refresh/logout + members/invitations) по-прежнему активен и доступен
без авторизации в single-режиме.

**Стенд:** API `127.0.0.1:3001`, web `localhost:3002`, `SINGLE_WORKSPACE` не задан → `true`
(`apps/api/src/env.ts:24`), `PLANS_ENFORCED=false`, Prisma ok, Redis ok.

## Результаты

| # | Проверка | Итог | Доказательства |
|---|---|---|---|
| 1 | Режим и bootstrap | **PASS** | `GET /health` → 200 `mode":"single-workspace"`, `database":"ok"`, `stripe":"mock"`; `GET /workspace/bootstrap` → 200 `{"mode":"single","plansEnforced":false,"tenant":{"name":"Demo Studio","slug":"main","planCode":"business","role":"OWNER"}}` |
| 2 | API без cookie/токена | **PASS** | 200: `/projects`, `/templates`, `/media`, `/admin/stats`, `/billing/entitlements`, `/projects/{id}`, `/projects/{id}/pages`. `POST /projects` → **201**, `DELETE /projects/cmwrzf91c003lusck3pic7v3m` → **200**, повторный список снова 1 проект. Клиентский прокси `/api/proxy/projects` → 200 (`apps/web/next.config.ts:23`) |
| 3 | Фронт не дёргает auth | **PASS** | `apps/web/src/lib/auth.tsx:44` грузит только `/workspace/bootstrap`; grep по `apps/web/src` на `/auth/me|/auth/guest|/auth/register|/auth/login` — 0 совпадений. Единственный auth-вызов — `POST /auth/refresh` как реакция на 401 (`lib/api.ts:33`). `POST /auth/login` с `demo@yazi.dev/demo12345` → **201** (маршрут жив, UI не использует) |
| 4 | UI-маршруты и сайдбар | **PASS** | `/login` → **307**→`/projects`, `/register` → **307**→`/projects`, `/billing` → **307**, `/invite/abc` → **307**, `/preview/abc` → **307**. `sidebar.tsx:12-17` — только Проекты/Шаблоны/Медиа/Настройки + тема; нет имени пользователя, «Выйти», «Тарифы». HTML `/projects` и `/settings`: 0 вхождений «Войти/Зарегистрироваться/Выйти/Тарифы» |
| 5 | Данные | **PARTIAL** | В рабочем пространстве ровно 1 проект — «Meridian Consulting» (`subdomain=demo`, 2 страницы, 1 домен lvh.me + 1 непроверенный custom `audit-test-9911.example.com`). Настройки: «Рабочее пространство», «Тема интерфейса», информационная карточка «Режим работы» (`settings/page.tsx:27-66`). **Но:** `/admin/stats` → `users:48, tenants:48, projects:20, activeSubscriptions:48, mrrCents:74000` |
| 6 | Остатки аккаунтов в UI | **FAIL (частично)** | Сайдбар всегда показывает «Админка» (`auth.tsx:93` `isSuperAdmin: true`), а `apps/web/src/app/(dashboard)/admin/page.tsx` содержит вкладку «Пользователи» с email/ролью/баном (`:130-207`), метрики «Пользователи» и «Регистрации за 30 дней» (`:70,99`), «Пользователи, тарифы, шаблоны» (`:32`) |
| 7 | typecheck | **PASS** | `npm run typecheck` — 7 воркспейсов (api, web, contracts, db, page-schema, templates, desktop) без ошибок; только npm-warn про `-ws` |

### Файлы с остатками аккаунтов

- `apps/web/src/lib/auth.tsx:23-27,96-103` — мёртвые `login/register/guest/logout`, `isSuperAdmin: true`.
- `apps/web/src/app/(dashboard)/admin/page.tsx` — экран пользователей/тарифов/регистраций.
- `apps/api/src/modules/auth/{auth.controller,guest.service,auth.service}.ts` — `/auth/login|register|guest|refresh|logout|change-password`.
- `apps/api/src/modules/tenants/tenants.controller.ts:11-27,30-72` — `/tenants`, `/workspace/members`, `/workspace/invitations` (доступны без cookie, т.к. guard'ы в single-режиме инжектят system-identity: `common/guards.ts:69-74,117-125,157`).
- `packages/db/prisma/seed.ts:236-260` — сид создаёт `admin@yazi.dev`/`demo@yazi.dev` с паролями.
- `scripts/cleanup-guests.mjs`, `package.json:26` — скрипт чистки гостей.
- `docs/COMPLIANCE.md:69,78` — устаревшее описание `POST /auth/guest` и `/login?manual=1`.

## Пробелы

1. **Админка не убрана:** `/admin` → 200 и открывается из сайдбара; вкладка «Пользователи» показывает
   реальные 48 аккаунтов (`smoke-*@test.dev`, `guest-*@demo.yazi.dev`, `system@yazi.local`) с кнопками
   блокировки и смены роли. Это аккаунт-зависимый экран в навигации.
2. **Данные не вычищены:** 48 пользователей / 48 workspace / 20 проектов в БД против 1 проекта в UI;
   `activeSubscriptions:48`, `mrrCents:74000` в `/admin/stats` — биллинг-метрики «мёртвого» аккаунт-контура.
3. **Auth-контур жив и не изолирован:** без cookie доступны `/tenants`, `/workspace/members`,
   `/workspace/invitations`, `/admin/users`; `POST /auth/guest` создаст новый аккаунт (не проверял создание).
4. **Рассинхрон плана:** bootstrap отдаёт `planCode:"business"`, а `/billing/entitlements` — `"pro"`
   (реальный план demo-тенанта из сида), лимиты 100000 — то есть тарифы формально «не выключены», а обнулены.
5. **Мелочь:** `/projects` содержит непроверенный custom-домен `audit-test-9911.example.com` (артефакт прошлого аудита).

## Рекомендации

1. **Убрать `/admin` из сборки без аккаунтов:** удалить пункт «Админка» и хардкод `isSuperAdmin: true`
   в `auth.tsx`, вырезать вкладки «Пользователи»/«Регистрации» либо оставить только «Обзор»/«Шаблоны»/«Журнал».
2. **Почистить данные и мёртвый контур:** удалить 48 legacy-аккаунтов (`guest-*`, `smoke-*`, `iso-*`, `attacker-*`),
   убрать `/auth/guest`, `/workspace/invitations`, `/workspace/members`, `scripts/cleanup-guests.mjs` и создание
   паролей в `seed.ts`; обновить `docs/COMPLIANCE.md`.
3. **Согласовать метаданные:** один источник плана (bootstrap ↔ entitlements ↔ admin/stats), убрать
   `mrrCents/activeSubscriptions` из `/admin/stats` в single-режиме и вычистить `audit-test-9911.example.com`.
