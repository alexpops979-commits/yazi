# Соответствие техническому заданию

Проверка по исходному ТЗ «Multi-tenant SaaS Website Builder». Дата: 22.11.2026.
Статусы: ✅ реализовано · ⚠️ частично · ⛔ отключено по запросу (код сохранён).

## Пользовательская часть

| Требование | Статус | Где | Комментарий |
|---|---|---|---|
| Регистрация | ✅ | `apps/api/src/modules/auth`, `apps/web/src/app/(auth)/register` | Email + scrypt, авто-создание workspace, trial 14 дней. По умолчанию вход скрыт авто-демо, регистрация доступна по `/register` |
| Создание проектов | ✅ | `apps/api/src/modules/projects` | CRUD, уникальный субдомен, публикация |
| Выбор шаблона | ✅ | `packages/templates`, `/templates` | 6 нишевых шаблонов, галерея, создание проекта/страницы из шаблона |
| Редактор страниц | ✅ | `apps/web/src/components/editor` | Canvas, палитра, слои, инспектор, тема |
| Добавление блоков | ✅ | `apps/web/src/blocks` | 17 типов блоков, клик и drag-and-drop |
| Текст и изображения | ✅ | `blocks/definitions.tsx`, `/media` | Inline-редактирование, медиатека (локально или S3) |
| Цвета и шрифты | ✅ | `editor/theme-panel.tsx` | 7 цветов, 2 шрифта, радиус, ширина контейнера |
| Предпросмотр | ✅ | `/preview/[token]`, `public/preview` | Подписанный токен, noindex, device-превью |
| Публикация сайта | ✅ | `pages.service.ts`, `/s/[[...path]]` | Версии, SSR по Host, кэш, sitemap/robots |

## Административная часть

| Требование | Статус | Где | Комментарий |
|---|---|---|---|
| Управление пользователями | ✅ | `/admin/users`, `AdminService` | Поиск, блокировка, выдача роли SUPER_ADMIN |
| Управление шаблонами | ⚠️ | `/admin/templates` (API), вкладка «Шаблоны» | Список и удаление в UI; создание — через API/seed. UI-редактор шаблонов отсутствует |
| Статистика публикаций | ✅ | `/admin/stats` | Публикации по дням, регистрации, счётчики |
| Управление тарифами | ⛔ | `AdminService.plans`, `/admin/plans` (API) | UI удалён по запросу; код сохранён |

## Продвинутые функции

| Требование | Статус | Где | Комментарий |
|---|---|---|---|
| Drag-and-drop редактор | ✅ | `editor/editor-shell.tsx` | dnd-kit: палитра → canvas, перемещение между контейнерами |
| Responsive preview | ✅ | `blocks/css.ts`, device-switch | Container queries: переключение устройства реально меняет раскладку |
| Собственные домены | ✅ | `modules/domains` | TXT `_dalmg-verify`, CNAME-фолбэк, primary-домен. SSL выдаёт хостинг |
| SEO-настройки | ✅ | `Project.seo`, `Page.seo` | title/description/OG/favicon/canonical/noindex, sitemap.xml, robots.txt |
| Публикация страниц | ✅ | `POST /pages/:id/publish` | Плюс publish-all для проекта |
| Версионирование | ✅ | `PageVersion` | Версия на каждую публикацию, список, восстановление в черновик |
| Автосохранение | ✅ | `POST /pages/:id/draft` | Debounce 1.2 с, optimistic lock `revision`, 409 и UI разрешения конфликта |
| Подписки и ограничения | ⛔ | `modules/billing`, `EntitlementsService` | Отключено по запросу: лимитов нет, все функции доступны. Включается `PLANS_ENFORCED=true` |

## Стек

| Компонент | Статус | Комментарий |
|---|---|---|
| Next.js + TypeScript | ✅ | App Router, server components для публичных сайтов |
| NestJS | ✅ | Модульная структура, guards, Zod-валидация |
| PostgreSQL + Prisma | ✅ | Мультитенантная схема, денормализованный `tenantId` |
| Redis | ✅ | Опционально: при отсутствии `REDIS_URL` — in-memory fallback |
| Stripe | ⛔ | Код Checkout/Portal/Webhooks сохранён, отключён вместе с тарифами |
| S3 | ✅ | Опционально: `S3_*` или локальный диск `apps/api/uploads` |

## Порядок разработки

1. Multi-tenant архитектура — ✅ (Prisma-extension + ALS + guards, изоляция проверена).
2. Проекты — ✅.
3. Шаблоны — ✅.
4. JSON-структура страниц — ✅ (`packages/page-schema`, версия схемы и миграции).
5. Визуальный редактор — ✅.
6. Drag-and-drop — ✅.
7. Preview — ✅.
8. Публикация — ✅.
9. Домены — ✅.
10. Подписки и ограничения — ⛔ отключено по запросу (код есть).

## Намеренные отклонения

- **Экран авторизации убран из пользовательского пути**: приложение открывается сразу в демо-пространстве
  (`POST /auth/guest`); реальный вход — `/login?manual=1`.
- **Тарифы и лимиты отключены** (`PLANS_ENFORCED=false`): все функции доступны всем, брендинг снят.
  Для сдачи по ТЗ включите `PLANS_ENFORCED=true` — вернутся планы, лимиты и `402 PLAN_LIMIT`.

## Известные ограничения

- Нет UI-редактора шаблонов (только API/seed).
- SSL для собственных доменов обеспечивает платформа хостинга, не приложение.
- Нет rate limiting на auth и e2e-тестов Playwright.
- Гостевые пространства накапливаются; очистка — `npm run db:cleanup-guests`.
