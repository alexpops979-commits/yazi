# 01 · Multi-tenant архитектура и регистрация/вход

**Оценка: PARTIAL.** Изоляция данных на уровне API работает (проверено HTTP: чужой project/page → 404, поддельный `X-Tenant-Id` → 403, без заголовка → 400, без сессии → 401), но найдена реальная эскалация прав через приглашения, «мягкие» сессии (logout/смена пароля не отзывают токены) и полное отсутствие анти-абьюза на публичных auth-маршрутах.

**Стенд:** API `127.0.0.1:3001`, demo@yazi.dev (Demo Studio, OWNER), Prisma 6.2.1, Redis доступен. Тестовые user/workspace/project создавались через API и остались в БД как артефакты аудита.

## Таблица проверок

| # | Область | Вердикт | Доказательства |
|---|---|---|---|
| 1 | `tenantId` в схеме | **PASS** | `tenantId` есть у всех тенант-таблиц: `schema.prisma:105,118,149,164,187,204,231,249,270,286,303,317`. Минус: у `ProjectDomain/Page/PageVersion/PublishEvent/PageViewDaily` это скаляр без FK на `Tenant` (`196,218,238,292,308`); у `PageViewDaily` нет `@@index([tenantId])` (`311-313`) |
| 2 | Prisma-extension | **PASS(−)** | `packages/db/src/tenant.ts:9-20` (список моделей), `75-80` (throw `TenantScopeError` без контекста), `83-94` (`create/createMany/upsert` инъекция tenantId), `95-106` (where на все чтения/записи), `errors.ts:68-71` → 403 `TENANT_SCOPE`. Обходы: `$queryRaw`, интерактивные `$transaction`, nested-writes; `Template/AuditLog/User/Plan/Tenant` вне скоупа (`23`) |
| 3 | Guards + ALS | **PARTIAL** | `guards.ts:104-112` (membership → 403), `117-123` (`@MinRole`), `76-82` (роль читается из БД — claim `role` из JWT не авторитетен). ALS ставится в `main.ts:22-27` **из непроверенного заголовка до guard'а**; `@Public`-маршруты тоже получают контекст из заголовка |
| 4 | Изоляция project/page (факт) | **PASS** | E1 `GET /projects/{чужой}` → **404** (projects.service.ts:37-46); E2/E3 `GET`, `PATCH /pages/{чужой}` → **404**; E5/E6 чужой `X-Tenant-Id` → **403**; B1 без заголовка → **400**; E8 без cookie → **401**; X1 publish/X2 stats чужого → **404** |
| 5 | Списки без 404 | **PARTIAL** | `GET /projects/{чужой}/pages` → **200 `[]`**, `GET /projects/nope/pages` → **200 `[]`** (`pages.controller.ts:24-27`, `pages.service.ts:30-37`): утечки нет, но контракт 404 нарушен |
| 6 | Регистрация/workspace/роли | **PASS** | `POST /auth/register` → **201**, создан workspace + `OWNER` + `free/TRIALING` на 14 дней (`auth.service.ts:35-45`), повторный email → **409**, короткий пароль/битый email → **400**; uppercase email нормализуется (`contracts/src/index.ts:80-88`) |
| 7 | Гостевой вход | **FAIL** | `POST /auth/guest` → **201**, изоляция соблюдена (guest project чужому → **404**, чужой tenant → **403**), но гость сразу получает `planCode=business` + `ACTIVE` на 365 дней (`guest.service.ts:36-54`) — платный тариф бесплатно и в обход entitlements; rate limit отсутствует (в `apps/**` нет ни `Throttler`, ни лимитера) |
| 8 | Cookie + JWT + `/auth/me` | **PASS** | Одна cookie `yazi_session` = `access\|refresh` (`http.ts:16-18`, в браузере `%7C`), `HttpOnly`, `SameSite=Lax`, `Secure` в prod (`http.ts:4-9`); TTL 15 мин / 30 дней (`crypto.ts:57-65`); `/auth/me` с cookie → **200**, без → **401**, Bearer → **200** |
| 9 | Refresh rotation | **PASS(−)** | refresh полной cookie → **201**, новый refresh; повтор старой пары → **401**; cookie только с refresh → **401** (`splitSession` требует разделитель `\|`, `http.ts:24-29`). Минусы: `del()`→`issue()` не атомарно, нет reuse-detection с отзывом семейства; access-токен при ротации не меняется (детерминированный payload) |
| 10 | Logout / смена пароля | **FAIL** | logout → **201**, но старый access-токен ещё работает: `GET /projects` → **200**. После смены пароля вторая сессия жива: refresh → **201**, access → **200**. Причина: `auth.service.ts:151-153` делает `redis.del('rt:*')` — буквальный ключ, а не паттерн; refresh хранятся по `rt:<jti>` (`94`) |
| 11 | Приглашения | **FAIL** | B приглашает `stranger@…` как ADMIN (токен возвращается в JSON, `tenants.service.ts:97`) → **demo** (посторонний) принимает токен → **201**, `GET /workspace/members` → **200**, `PATCH /workspace` → **200**. В `tenants.service.ts:118-131` нет сверки `invitation.email` с email пользователя |
| 12 | Роли | **PASS** | VIEWER: `GET /projects` **200**, `POST /projects` **403**, `DELETE /workspace/members/*` **403**; OWNER нельзя удалить (`tenants.service.ts:136`); `X-Tenant-Id` в теле запроса игнорируется — проект создался в тенанте из заголовка (B1/B2) |

## Пробелы

1. **Критично — эскалация через приглашение:** принимается любым аутентифицированным пользователем, а не адресатом; роль берётся из приглашения, экран `PATCH /workspace` открыт новому ADMIN'у. Приглашение к тому же работает как «вечная» ссылка (7 дней, без отзыва при смене ролей).
2. **Критично — сессии:** `logout` не отзывает access-токен (живёт до 15 мин), `change-password` не отзывает ни чужие refresh, ни access (`redis.del('rt:*')` — no-op). Компрометация refresh = сессия на 30 дней.
3. **Высоко — ALS из недоверенного заголовка:** `main.ts:25` создаёт tenant-контекст до аутентификации; сейчас безопасно только потому, что все `@Public`-сервисы дисциплинированно используют `prisma.raw`. Любой новый handler на `prisma.db` под `@Public` = кросс-тенантная утечка.
4. **Высоко — нет deny-by-default:** guard'ы вешаются вручную на каждый контроллер (`app.module.ts:15-31`); новый контроллер без `@UseGuards` открыт по умолчанию.
5. **Средне — нет rate limit/lockout** на `/auth/login`, `/auth/register`, `/auth/guest` (пароль всего `min(8)`), гость создаёт ~10 строк в БД за вызов и не чистится по TTL → абьюз и рост БД.
6. **Средне — гостям выдаётся `business`-план** (`guest.service.ts:40,50`) в обход платного тарифа и лимитов.
7. **Средне — регистрация не транзакционна:** user → tenant → membership → subscription по отдельности (ни одного `$transaction` в API); сбой между шагами оставляет пользователя без workspace, а повтор даёт 409.
8. **Низко — конфиг/CSRF:** `env.ts:17` допускает хардкод-`JWT_SECRET` без fail-fast в prod; CSRF закрыт только `SameSite=Lax` (нет токена/проверки Origin); `emailVerifiedAt` ставится сразу (`auth.service.ts:31`) — подтверждения почты нет; списки отдают `200 []` вместо 404 (`pages.service.ts:30`).

## Рекомендации

1. **Один источник тенанта.** Убрать `runWithTenant(header)` из `main.ts`; после `TenantGuard` выполнять остаток запроса в `runWithTenant(verifiedTenantId)` (интерсептор/`AsyncLocalStorage`-middleware после guard'а) и включить глобальный `APP_GUARD` с `@Public` как единственным исключением — тогда забытый `@UseGuards` не открывает данные.
2. **Приглашения привязать к личности.** Сверять `invitation.email` (нормализованный) с `user.email` или хранить `invitedUserId`; не возвращать `token` в JSON — отправлять ссылку письмом, TTL 24-72 ч, отзывать pending-приглашения при смене роли/удалении участника и запретить `PATCH /workspace` до подтверждения.
3. **Сессии и абьюз.** Хранить refresh-семейство (`rt:<userId>:<familyId>` + hashed jti), при replay отзывать всё семейство; `logout`/`change-password` — удаление по индексу пользователя (`SCAN`/`SMEMBERS`, не `del('rt:*')`) и короткий access-TTL; добавить rate limit на `/auth/*`, `JWT_SECRET` проверять на старте (fail-fast), гостям — `free` + TTL-очистка.

*Отчёт: только чтение кода и HTTP-запросы; исходники, пакеты, серверы и данные (кроме созданных тестовых сущностей) не изменялись.*
