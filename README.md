# Yazi — конструктор сайтов (landing page builder)

Multi-tenant по архитектуре, single-workspace по умолчанию: визуальный редактор лендингов,
78 шаблонов, каталог из 1000 идей для GitHub, публикация на поддомены и свои домены.
Без экрана входа — приложение открывается сразу в рабочем пространстве.

![Dashboard](docs/screenshots/dashboard-light.jpg)

| Редактор | Идеи для GitHub |
|---|---|
| ![Editor](docs/screenshots/editor.jpg) | ![Ideas](docs/screenshots/ideas.jpg) |

| Шаблоны | Тёмная тема |
|---|---|
| ![Templates](docs/screenshots/templates.jpg) | ![Dark](docs/screenshots/dashboard-dark.jpg) |

---

## Возможности

**Конструктор**
- визуальный редактор: canvas, палитра, слои, инспектор, тема (цвета, шрифты, радиус, ширина);
- 17 типов блоков: секция, контейнер, колонки, сетка, заголовок, текст, кнопка, бейдж,
  разделитель, отступ, иконка, показатель, изображение, видео, HTML-код, навигация, форма;
- drag-and-drop (dnd-kit) + вставка кликом, клавиатурное управление;
- inline-редактирование текста, undo/redo, горячие клавиши;
- автосохранение с optimistic lock и разрешением конфликтов между вкладками;
- responsive: container-queries, три устройства и масштаб — раскладка меняется по-настоящему;
- предпросмотр по подписанной ссылке, device-превью.

**Контент и публикация**
- 78 шаблонов (24 ниши × 3 вёрстки + 6 ручных) с локальными SVG-обложками;
- каталог **1000 идей** для GitHub: сложность 1–10, backend/frontend/fullstack, 22 языка,
  фильтры и комбинирование языков;
- версионирование: версия на каждую публикацию, список и откат;
- SSR публичных сайтов по `Host`, кэш в Redis, sitemap.xml и robots.txt;
- SEO: title/description/OG/canonical/noindex/favicon;
- свои домены: TXT/CNAME-верификация, основной домен (SSL — на стороне хостинга).

**Платформа**
- multi-tenant схема (`tenantId` везде) + Prisma-extension, запрещающий запросы без контекста;
- один workspace без аккаунтов; режим аккаунтов возвращается `SINGLE_WORKSPACE=false`;
- тёмная/светлая тема без вспышки при загрузке;
- медиатека: локальный диск или S3/R2;
- админка: статистика, шаблоны, пользователи (legacy), журнал;
- тарифы и Stripe **отключены** (`PLANS_ENFORCED=true` возвращает планы и лимиты — код сохранён).

## Стек

**Next.js 15 · TypeScript · NestJS 11 · PostgreSQL · Prisma 6 · Redis (optional) · S3/R2 (optional) · Electron**

---

## Быстрый старт

Нужны **Node.js 22+** и **PostgreSQL 16+** (локально или Neon). Docker не обязателен.

```bash
git clone <your-repo> yazi
cd yazi

# 1. зависимости и общие пакеты
npm install
npm run build:packages

# 2. окружение
cp .env.example .env      # Windows: Copy-Item .env.example .env
# DATABASE_URL укажите на свою базу

# 3. схема и демо-данные
npm run db:push
npm run db:seed

# 4. запуск (API :3001 + web :3002)
npm run dev
```

| Что | Адрес |
|---|---|
| Дашборд | http://localhost:3002 |
| Демо-сайт | http://demo.lvh.me:3002 |
| API health | http://127.0.0.1:3001/health |

Windows: двойной клик по **`start.bat`** — откроет API и web в отдельных окнах.
`lvh.me` и `*.lvh.me` резолвятся в `127.0.0.1`, поэтому поддомены работают без правки hosts.

### Локальная база без установки

```bash
npm run db:local   # изолированный PostgreSQL на 5433 (Windows, если установлен PostgreSQL)
```

После этого в `.env`: `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/yazi?schema=public"`.

### Полезные команды

| Команда | Что делает |
|---|---|
| `npm run dev` | API + web |
| `npm run build` | сборка пакетов, API и web |
| `npm run typecheck` | типы во всех воркспейсах |
| `npm run db:push` / `db:seed` | схема / демо-данные |
| `npm run ideas:export` | `docs/GITHUB_IDEAS.md` из JSON |
| `npm run smoke` | e2e API (нужен запущенный API) |
| `node scripts/smoke-web.mjs` | SSR сайта, preview, sitemap |
| `node scripts/audit-security.mjs` | проверки безопасности и валидации |
| `npm run desktop` | Electron-приложение из исходников |
| `npm run desktop:pack` / `desktop:installer` | portable-сборка / установщик |

---

## Архитектура

```
apps/
  api/            NestJS: auth (legacy), проекты, страницы, версии, публикация,
                  медиа, домены, биллинг (выключен), публичный API, админка
  web/            Next.js: дашборд, редактор, идеи, шаблоны, SSR публичных сайтов
  desktop/        Electron-оболочка + NSIS-установщик
packages/
  db/             Prisma-схема, tenant-scoped клиент, seed, миграции
  contracts/      Zod-схемы и общие типы API/web
  page-schema/    JSON-документ страницы, дерево блоков, миграции
  templates/      78 шаблонов + генератор (24 пресета × 3 вёрстки)
```

### Как устроена изоляция

Каждая тенант-таблица содержит `tenantId`. Клиент `@yazi/db` — расширение Prisma, которое
подставляет `tenantId` в `where` каждого запроса и бросает ошибку без контекста.
Контекст задаёт middleware через `AsyncLocalStorage`, а `TenantGuard` проверяет членство.
В single-workspace режиме контекст всегда указывает на одно рабочее пространство.

### JSON-документ страницы

```jsonc
{
  "schemaVersion": 1,
  "theme": { "colors": { "primary": "#2F5BEA" }, "fonts": { "heading": "Manrope", "body": "Inter" }, "radius": 12, "containerWidth": 1120 },
  "sections": [{
    "id": "sec_1",
    "type": "section",
    "props": { "tag": "section", "container": true },
    "style": { "padding": { "base": [72,24,72,24], "mobile": [40,16,40,16] } },
    "children": [
      { "id": "h_1", "type": "heading", "props": { "text": "Заголовок", "level": 1 }, "style": {} }
    ]
  }]
}
```

Responsive-значения: `base → tablet → mobile`. CSS генерируется в container-queries,
поэтому переключение устройства в редакторе меняет реальную раскладку.

### Публикация

1. `POST /pages/:id/publish` валидирует документ, создаёт `PageVersion` и снимок.
2. Инвалидируется кэш проекта (`sitever:{projectId}` в Redis).
3. Next.js middleware резолвит `Host`, server component запрашивает опубликованную страницу
   из API и рендерит её тем же реестром блоков, что и редактор.

---

## Идеи для GitHub

- Интерактивно: **/ideas → «Для GitHub»** (фильтры по категории, языку, сложности, роли, поиску).
- Markdown-каталог: [`docs/GITHUB_IDEAS.md`](docs/GITHUB_IDEAS.md) — 1000 идей, 10 категорий.
- Данные: `apps/web/src/data/github-ideas.json`, генератор — `scripts/generate-ideas.mjs`.
- Языки можно комбинировать: мультивыбор + режим «только где сочетаются».

## Настольное приложение

```bash
npm run desktop            # запуск из исходников
npm run desktop:pack       # portable: apps/desktop/release/Yazi-win-x64 + zip
npm run desktop:installer  # NSIS: apps/desktop/release/Yazi-Setup-1.0.0.exe
npm run icon               # иконка из apps/desktop/build/icon.svg
```

Приложение умеет запускать локальный сервер (`npm run dev`) при старте, хранит настройки в
`%APPDATA%\Yazi\config.json`, логи — в `%APPDATA%\Yazi\logs`. Иконка воспроизводит референс:
градиентный squircle, окно браузера, блок с `T` и три здания.

## Тесты и CI

```bash
npm run typecheck
node scripts/smoke.mjs          # API: auth, лимиты, публикация, изоляция
node scripts/smoke-web.mjs      # SSR, preview, sitemap, robots
node scripts/audit-security.mjs # инъекции, размеры, валидация, rate limit
```

CI (`.github/workflows/ci.yml`) поднимает PostgreSQL, применяет схему, сидит демо-данные,
запускает API-смоук, собирает web и API.

## Тарифы и монетизация

По умолчанию выключены: все функции доступны, брендинг не добавляется, лимитов нет.
Код Stripe (Checkout/Portal/Webhooks), `Plan`/`Subscription` и проверки `402` сохранены:

```env
PLANS_ENFORCED=true   # вернуть тарифы и лимиты
```

## Ограничения

- Один workspace без аккаунтов (`SINGLE_WORKSPACE=false` включает auth-контур).
- Форма на сайте визуальная; приём заявок — через endpoint в настройках блока.
- SSL для своих доменов выдаёт платформа хостинга (Vercel/Cloudflare/Caddy).
- Нет rate limiting на публичных API, кроме `/auth/*`.
- Каталог идей частично сгенерирован по матрице «тип × отрасль».

## Лицензия

См. [LICENSE.md](LICENSE.md). Коммерческое использование — по согласованию с автором.
