# 02 · Проекты пользователей, субдомены и лимиты/флаги

**Оценка: PARTIAL.** CRUD проектов, изоляция тенантов, отключённые лимиты, безлимитные entitlements, 403 на checkout и снятый брендинг подтверждены HTTP-прогоном. Блокирует оценку реальный дефект: страницы, созданные через `POST /projects/:id/pages`, нельзя опубликовать — `400 VALIDATION "sections Required"`; `publish all` при этом успевает опубликовать часть страниц. Плюс субдомены при коллизии молча переименовываются, а `siteUrl` всегда `http`.

**Стенд:** API `127.0.0.1:3001`, web `3002`, demo@dalmg.dev (Demo Studio `cmwrv1zus…`, plan `pro`, OWNER), Meridian `subdomain=demo`. Все созданные для аудита проекты/страницы удалены через API; в БД остались только прежние `demo`, `body-tenant-probe`, `audit-probe-bistro`.

## Таблица проверок

| # | Область | Вердикт | Доказательства |
|---|---|---|---|
| 1 | CRUD `/projects` | **PASS** | `GET /projects` → **200** (3 проекта, Meridian `pageCount=2, published=2`), `GET /projects/{id}` → **200**, `POST` ×2 → **201**, `PATCH name` → **200**, `DELETE` → **200**, повторный `GET` → **404**. Контроллер `projects.controller.ts:23-58`, сервис `projects.service.ts:25-122`; запись только `EDITOR+`, удаление `ADMIN+` |
| 2 | Изоляция тенантов | **PASS** | Тенант-скоуп Prisma (`packages/db/src/tenant.ts:68-106`): второй workspace demo-пользователя → `GET /projects` **200 count=0**, `GET/PATCH/DELETE` чужого проекта → **404**. Параметр `tenantId` в `list/get` не используется, но ALS-скоуп закрывает выборку |
| 3 | Субдомены и уникальность | **PARTIAL** | `POST {subdomain:"demo"}` → **201 `demo-ax1c`**, `{subdomain:"api"}` → **201 `api-2pf`** (резерв, `contracts:178-194`), `"Bad_Sub"` → **400 VALIDATION**; `PATCH` в занятый `audit-upd-b` → **200 `audit-upd-b-7bzz`** (`projects.service.ts:206-219`). Коллизия не даёт 409/понятной ошибки; гонка двух create → необработанный P2002 (нет retry) |
| 4 | Модель Prisma | **PASS(−)** | `Project.subdomain @unique` (`schema.prisma:166`), `Page @@unique([projectId,path])` (`:224`), `ProjectDomain.host @unique` (`:189`), каскады (`:196,218,293,308`). Минусы: `Page/ProjectDomain.tenantId` — скаляр без FK (`:187,204`), `DomainKind.SUBDOMAIN` никогда не пишется (поддомен синтетический, `projects.service.ts:260-264`), `ProjectStatus.ARCHIVED` нигде не выставляется, а `DELETE` — жёсткий (`:116-122`) |
| 5 | Лимиты выключены по умолчанию | **PASS** | `PLANS_ENFORCED` нет в `.env`; `env.ts:22` → `false`; `GET /billing/entitlements` → **200** c `projects/pagesPerProject/customDomains=100000`, `customCode=true`. Создано 2 проекта подряд (**201+201**), в один — 4 страницы (**201×4**, всего 5), ни одного **402**. Для free-тенанта (второй workspace) лимиты тоже безлимитные, `POST /projects` → **201** |
| 6 | `/billing/entitlements` и `/checkout` | **PASS** | `POST /billing/checkout {planCode:"pro"}` → **403 `PLANS_DISABLED`** (`billing.service.ts:67-70`); `GET /billing/plans` → **200** (free 1/3/0, pro 10/50/3, business 100/500/25), `GET /billing/subscription` → **200 `{planCode:"pro",stripeConfigured:false}`** |
| 7 | Поведение при `PLANS_ENFORCED=true` | **PARTIAL** (по коду) | `entitlements.service.ts:43-45` берёт `Plan.limits` из БД вместо `UNLIMITED_LIMITS`; `assert/assertWithin` (`:63-89`) кидают **402 `PLAN_LIMIT`** с `upgradeTo` (`errors.ts:13-29`) на проекты/домены/customCode/страницы. `checkout` без Stripe делает mock-upgrade (`billing.service.ts:75-80`), `public.service.ts:180-185` вернёт брендинг free-плану и срежет customCode. Но: `duplicate()` лимит страниц не проверяет (`pages.service.ts:263-289`), trial не расширяет лимиты, UI тарифов отсутствует (см. п. 9) |
| 8 | Брендинг на публичных сайтах | **PASS** | `GET /public/resolve?host=demo.lvh.me:3002` → **200 `project.branding=false`**; HTML сайта (Host-заголовок) **200**, ссылки `dalmg.dev`/badge нет (`apps/web/src/app/s/[[...path]]/page.tsx:58-62`). Это следствие `UNLIMITED_LIMITS.removeBranding=true` (`contracts:54-62`), а не отдельного флага тенанта; при включении планов free получит бейдж обратно |
| 9 | Публикация новых страниц | **FAIL** | `POST /projects/{id}/publish` → **400 `{"details":[{"path":"sections","message":"Required"}]}`**; Home при этом уже `PUBLISHED`, а 4 новые страницы — `DRAFT`; одиночный `POST /pages/{id}/publish` для них → **400**, для Home → **201**. Причина: `pages.service.ts:78` `migrateDocument({})` возвращает документ без `sections` (`page-schema:381-384`), тогда как проект создаётся через `blankDocument()` (`projects.service.ts:52`) |
| 10 | Биллинг в web | **PARTIAL** | `/billing` → **307** на `/projects` (`middleware.ts:22-28`, `billing/page.tsx:5`); 402 в UI показывается только текстом `ApiError` (`web/src/lib/api.ts:67-72`), кнопки апгрейда нет |

## Пробелы

1. **Высоко — новые страницы не публикуются:** пустой документ без `sections` сохраняется как валидный draft и падает только на publish; `publishAll` не транзакционен — возвращает 400 после частичной публикации (`projects.service.ts:124-138`), клиент не знает, что опубликовано.
2. **Средне — контракт субдомена:** явно занятый/резервный субдомен молча заменяется суффиксом (201), пользователь видит другой адрес; гонка create/update не ловится (P2002 → 500).
3. **Средне — кэш и URL:** `Project.update` инвалидирует `site-cache` только при смене subdomain (`projects.service.ts:111`), поэтому name/SEO/customCode/favicon до 5 минут отдаются старым (`site-cache.service.ts:4`); `siteUrl` жёстко `http://` (`projects.service.ts:264`) даже в production.
4. **Средне — включение планов:** нет UI тарифов/апгрейда, `checkout` mock-only, free-план в 3 страницы обходится `duplicate`, trial-лимиты не отличаются от free; seed `Plan` и `DEFAULT_LIMITS` дублируются.
5. **Низко — модель/данные:** `tenantId` без FK у Page/ProjectDomain, неиспользуемый ARCHIVED, `SUBDOMAIN` в enum без записей; имя проекта не синхронизирует `seo.title` (остаётся старое).
6. **Низко — валидация:** неизвестный `templateId` тихо заменяется пустым шаблоном (`projects.service.ts:198-204`), `GET /projects/{id}/stats` и `get` не учитывают ARCHIVED.

## Рекомендации

1. **Починить публикацию:** при создании страницы использовать `blankDocument()` или `sections: []`, валидировать `parseDocument` до записи; `publishAll` — в транзакции либо с отчётом `{published, failed}` и кодом 207/400 без частичных публикаций.
2. **Сделать субдомены предсказуемыми:** суффикс — только для автогенерации, явный ввод при коллизии → **409 `SUBDOMAIN_TAKEN`**; retry на P2002; инвалидировать `sitever` при любом изменении проекта; строить `siteUrl` по `env.isProd` (https).
3. **Довести тарифный режим:** вернуть `/billing` (или экран плана) с entitlements/402-CTA, проверять лимит в `duplicate` и учитывать trial, оставить единый источник лимитов (Plan seed = DEFAULT_LIMITS); branding/customCode считать флагом плана, а не побочным эффектом `UNLIMITED_LIMITS`.
