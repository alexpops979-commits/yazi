# 12 — Тёмная тема

**Итог: PARTIAL.** Переключение и сохранение темы работают, canvas редактора не перекрашивается,
но тема применяется только после гидратации (**вспышка светлой темы ~0.5 с**), а слой ручных
`!important`-оверрайдов даёт нечитаемые элементы (80 бейджей на `/templates` — 1.48:1) и конфликтует
с `dark:`-утилитами.

**Стенд:** web `http://localhost:3002`, API `127.0.0.1:3001`. Встроенный браузер не подключён
(`browser.disconnected`), поэтому UI гонялся в headless Chrome 1440×900 через CDP (только чтение,
исходники и серверы не трогались). Скриншоты: `%TEMP%\imitri-window\dark-nojs.png`,
`dark-projects.png`, `dark-modal.png`, `dark-editor3.png`.

## Результаты

| # | Проверка | Итог | Доказательства |
|---|---|---|---|
| 1 | Тумблер в сайдбаре | **PASS** | клик: `html.className "" → "dark"`, `localStorage['yazi:theme'] null → "dark"`, `body` bg `rgb(245,246,250) → rgb(11,16,32)`; повторный клик возвращает `""`/`light` |
| 2 | Тумблер в топбаре редактора | **PASS** | `/editor/<p>/<pg>`: `class "dark" → ""`, stored `dark → light`, `title` меняется на «Тёмная тема», иконка Moon↔Sun перерисовывается (`theme-toggle.tsx:19-29`) |
| 3 | Сохранение после reload | **PASS** | reload `/projects`: `<html class="dark">`, stored `dark`, `body` `rgb(11,16,32)` — то же в редакторе |
| 4 | Фолбэк на системную тему | **PASS** | stored пуст + `prefers-color-scheme: dark` → `class="dark"`, bg `rgb(11,16,32)`; `light` → `class=""`, bg `rgb(245,246,250)` (`providers.tsx:10-12,22`) |
| 5 | Нет вспышки при загрузке | **FAIL** | CDP-замер: `first-paint` = **96 ms** при `html.className=""` (светлый кадр), класс `dark` появляется на **~571 ms**, `first-contentful-paint` = 584 ms. SSR-ответ: `<html lang="ru">` без класса и без inline-скрипта темы; класс ставится в `Providers.useEffect` (`providers.tsx:9-13`), т.е. после гидратации. При `Emulation.setScriptExecutionDisabled(true)` (stored=dark) страница остаётся светлой: `class=""`, bg `rgb(245,246,250)` — визуальное подтверждение в `dark-nojs.png` |
| 6 | Дашборд `/projects` | **PASS** | body 15.36:1; `.card` `#0f172a` + текст `rgb(241,245,249)` = 16.3:1; `text-slate-500` = 6.96:1; бейдж «2 стр.» 12.02:1. Скан 400 текстовых узлов: 0 провалов <3:1 |
| 7 | Шаблоны `/templates` | **FAIL** | 80 меток категории `<span class="… bg-white/90 … text-slate-600">`: bg `rgba(255,255,255,0.9)` (не перекрыт) + принудительный цвет `rgb(203,213,225)` = **1.48:1** (`templates/page.tsx:69`). Чипы фильтра с `bg-brand-50` остаются светлыми островами |
| 8 | Идеи `/ideas` | **PASS** | `.card` `#0f172a`; активный чип использует `dark:bg-brand-500/15 dark:text-brand-200` (`ideas/page.tsx:79`); скан: 0 провалов; неактивные чипы 12.02:1, primary-кнопка 6.77:1 |
| 9 | Админка `/admin` | **PASS** | 6 карточек `#0f172a`/`#1f2937`, скан карточек 0 провалов; активная вкладка `#0f172a` + `#f1f5f9` = 16.3:1, неактивная 5.71:1. Мелочь: даты графика `text-slate-400` → `#64748b` = 3.75:1 |
| 10 | Редактор: панели/поля | **PARTIAL** | header/aside `#0f172a`, поля ввода `#0b1220` + `#e2e8f0` (15:1), инспектор и панель «Тема» — тёмные. Но активная вкладка «Блоки» `text-brand-600` `rgb(35,75,219)` на `#0f172a` = **2.64:1**; неактивные вкладки и футер `#64748b` = 3.75:1 при 10 px; выбранная строка в «Слоях» — светлый `bg-brand-50` |
| 11 | Canvas остаётся светлым | **PASS** | inline `background-color: rgb(255,255,255)` → computed `rgb(255,255,255)`; контент сайта: `h1` `rgb(15,23,42)`, секция `rgb(247,249,255)` — тема сайта не перезаписывается. Косметика: рамка canvas `border-slate-300` → `#1f2937` |
| 12 | CSS-реализация | **PARTIAL** | `tailwind.config.js:4` `darkMode:'class'` ✅. Все overrides — в `globals.css:48-101` через `!important`; в собранном CSS 15 `!important`-правил `.dark …` и 14 `:is(.dark)`-вариантов, `prefers-color-scheme` в CSS отсутствует (системная тема только из JS). Конфликты: `.dark .bg-white !important` побеждает `dark:bg-slate-950` (сайдбар: задумано `#020617`, фактически `#0f172a`); перекрыты `bg-white`, `/60`, `/80`, но не `/90`; arbitrary-классы `.dark .bg-[#F5F6FA]`, `.dark .bg-[#EEF1F6]` дублируют inline-значения |

## Пробелы

1. **Вспышка.** Тема ставится в `useEffect` → первый кадр всегда светлый (96 ms), тёмный — к 571 ms. Нет блокирующего скрипта в `<head>`, SSR не знает о теме.
2. **`bg-white/90` не перекрыт.** 80 нечитаемых бейджей на `/templates` (1.48:1) — прямое следствие «перечислительных» overrides.
3. **`!important` перебивает `dark:`-утилиты.** Сайдбар `dark:bg-slate-950` не работает; любые будущие `dark:bg-*`, `dark:text-*` на элементах с `bg-white`/`text-slate-*` будут молча игнорироваться.
4. **Инверсия иерархии серого.** `.dark .text-slate-400 → #64748b` темнее, чем `.text-slate-500 → #94a3b8`; мелкий текст (футер, rev, даты графиков) даёт 3.75:1 < AA 4.5.
5. **Светлые острова.** `Badge` tone green/amber/red/blue/purple (`ui.tsx:92-96`), `Alert` (`:216-218`), активные чипы шаблонов, выбранная строка слоёв, бейдж «системный» — остались палитрой светлой темы.
6. **Мелочи.** У `ThemeToggle` нет `aria-label` (только `title`); до эффекта иконка = Moon, затем переключается на Sun (микро-мерцание).

## Рекомендации

1. **Убрать вспышку:** inline-скрипт в `<head>` root layout (или `next-themes` с `attribute="class"`, `storageKey="yazi:theme"`, `defaultTheme="system"`, `disableTransitionOnChange`), `suppressHydrationWarning` на `<html>`; `Providers` оставить только для auth.
2. **Заменить слой `!important` на токены:** `bg-surface/bg-panel/text-muted` (CSS-переменные с `.dark`-значениями) или `dark:`-классы в компонентах; как минимум добавить `dark:bg-white/10`, `dark:text-slate-200` для `bg-white/90` и палитр `*-50`, и убрать `!important`, иначе `dark:`-утилиты не работают.
3. **Поднять контраст мелкого текста:** `.dark .text-slate-400 → #94a3b8`, активная вкладка редактора `text-brand-600 → dark:text-brand-300` (сейчас 2.64:1), футер/rev — `text-slate-300`; проверить AA 4.5 для 10-11 px.
