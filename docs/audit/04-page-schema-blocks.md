# 04 · JSON-структура страниц и блоки

**Оценка: PARTIAL.** Схема, реестр блоков, CSS-генератор и рендерер — зрелые и согласованы между собой.
Граница API (валидация/лимиты/prune) реализована частично: часть проверок недостижима, миграция слишком лояльна.

## 1. packages/page-schema — PASS(−)
- zod-схема: `styleSchema` (81-104), рекурсивный `nodeSchema` через `z.lazy` (118-126), `pageDocumentSchema` (202-206), `themeSchema` (175-188), `DEFAULT_THEME` (147-160).
- `SCHEMA_VERSION = 1` (194). Миграция `migrateDocument` (371-385) — «best effort»: мерж темы с дефолтами, `normalizeNode` (387-395) подставляет `id`/`type='container'`/`props={}`/`style={}`. Версионных шагов (switch по версии) нет, входящий `schemaVersion` **перезаписывается** на 1.
- Responsive: `DEVICES = mobile|tablet|desktop` (7), `Responsive<T>` base/mobile/tablet/desktop (10-15), каскад `resolveResponsive` (21-26: mobile→tablet→base, desktop→base).
- Хелперы дерева (226-322): `walkNodes`, `findNode`, `findParent`, `removeNode`, `insertNodeAt`, `updateNode`, `cloneNodeWithNewIds`, `countNodes` — все иммутабельные.
- Минусы: нет тестов/скрипта test; `resolveResponsive` нигде не используется (css/inspector дублируют логику с другим каскадом); zod не strict → лишние ключи молча отбрасываются (`extraTop` и `style.bogusProp` исчезают после parse — проверено node).

## 2. Реестр блоков — PASS
`definitions.tsx` 553-571 → 17 типов: `section, container, columns, grid, heading, text, button, badge, divider, spacer, icon, stat, image, video, embed, nav, form`.
Проверено подсчётом: 17 × `type`, 17 × `defaultProps`, 17 × `controls`, 17 × `render`; `acceptsChildren: true` — 4 (section, container, columns, grid). `registry.ts` строит `BLOCK_REGISTRY` + `KNOWN_BLOCK_TYPES` (4-12), `PALETTE` по 4 категориям. Inline-редактирование (`editableProps`, 59-78) — 6 блоков.
Минус: `props.ratios` (columns) и `props.fit` (image) из сид-документов нигде не читаются — рендер и CSS их игнорируют.

## 3. CSS-генерация — PARTIAL
`BASE_CSS` (8-74) + `themeCss` (76-91, CSS-переменные из темы) + `buildCss` (206-224): на узел desktop-правило и `@container pb-root` переопределения 1023px/639px с `diff()` (190-196).
Пробелы: три разных набора брейкпоинтов — 1023/639 в `buildCss` (218/221) против 1023/**767**/639 в `BASE_CSS` (21-23, 53) → в зоне 640-767px блоки уже «мобильные», а responsive-переопределения ещё нет; `pick()` (106-112) падает на `desktop` для mobile/tablet, т.е. расходится с `resolveResponsive`; селектор `.pb-root .pb-${id}` (209) строится из непроверенного `node.id`; значения цвета/шрифта не санитизируются и вставляются в `<style dangerouslySetInnerHTML>` (page.tsx s/[path]:56, preview:23) — тема принимает любую строку (`themeSchema`), т.е. CSS-инъекция.

## 4. Рендерер — PASS(−)
`renderNode` (render.tsx 6-29) рекурсивен, передаёт `node/props/style/children/ctx`, ключи по id; неизвестный тип → заглушка «Unknown block: X» (9-13) — но **без детей** и в published-режиме тоже. `PageRenderer` (31-47) вешает `.pb-root`/`.pb-canvas`. Режимы: editor (contentEditable, preventDefault на ссылках, embed как заглушка, outline), preview/published (iframe, lazy img). `ctx.device` блоками не используется — адаптив целиком на container queries.

## 5. Валидация автосохранения — PARTIAL
`saveDraft` (pages.service.ts 123-152): размер → `parseDocument` → optimistic lock по `revision` (409 + серверный документ, UI-модалка есть).
Живые проверки `POST /pages/:id/draft` (демо-страница Home):

| # | Вход | Ответ |
|---|---|---|
| T1 | `sections:"nope"` | **400** `VALIDATION`, path `sections` |
| T2 | `schemaVersion:7` + узел без `id/type` | **201**, узел стал `container` |
| T3 | узел `type:"mystery-widget"` | **201**, тип сохранён как есть |
| T4 | 150 KB | **500** INTERNAL (не 413) |
| T5 | 1.5 MB | **500** INTERNAL |
| T6 | вложенность 1200, 82 KB | **500** (RangeError в zod) |

Т.е. структурный «мусор» (sections не массив, документ-массив) → 400 корректно (`ZodValidationPipe` guards 137-154, `AllExceptionsFilter` 58-66), а семантика — нет: `migrateDocument` «лечит» отсутствие `id/type/theme`, версия схемы игнорируется, пустой `sections: []` принимается (стирание страницы). Лимит `MAX_DOCUMENT_BYTES = 2_000_000` (18) недостижим: body-parser Nest режет ~100 KB раньше и отдаёт 500 вместо `413 DOCUMENT_TOO_LARGE`. В редакторе (editor-shell 59-87) при любой ошибке кроме 409 вызывается `markSaved` → `dirty=false`, ошибка только тостом (риск молчаливой потери).

## 6. Prune неизвестных блоков и лимиты — FAIL
`pruneUnknownBlocks` (index.ts 405-420) не вызывается **нигде** (grep: только объявление и dist); `KNOWN_BLOCK_TYPES` живёт в web и в API не передаётся. Следствие: T3-документ сохраняется и уезжает в `POST /publish` (pages.service 162: только `parseDocument` + `stripCustomBlocks` 350-356, где проверка `type !== 'html'` — типа `html` не существует) → посетитель видит «Unknown block». Сам prune к тому же теряет детей неизвестного узла. Лимитов на число секций/узлов/глубину нет.

## Рекомендации
1. Один источник responsive-логики: экспортировать брейкпоинты и `resolveResponsive` из `page-schema`, заменить дубли в `css.ts` (106-112) и `inspector.tsx` (319-349), привести `BASE_CSS` 767 → 640; в инспекторе фон/выравнивание писать в текущий bucket, а не всегда в `base` (inspector 264-265, 277).
2. Ужесточить границу: `express.json({limit:'2mb'})` + маппинг `PayloadTooLarge` в 413, zod `.strict()` по документу/стилю (или `passthrough` осознанно), явная проверка `schemaVersion` (400 при >SCHEMA_VERSION), обязательные `id/type` вместо `normalizeNode`-подстановок, лимиты depth≤50 и узлов≤5000, `RangeError` → 400; в редакторе не вызывать `markSaved` при 4xx/5xx.
3. Включить prune на save/publish: вынести каталог типов в `packages/contracts` (общий для web/API), `pruneUnknownBlocks` сохранять детей и логировать; валидировать цвета темы (hex/rgb) перед вставкой в `<style>`; добавить `tests` на `parseDocument`/`migrateDocument`/`pruneUnknownBlocks`.

---
Побочный эффект аудита: тестовые записи в черновик Home (T2/T3) откатаны — содержимое побайтно равно исходному (deep-equal `true`); изменилась только `draftRevision` (1 → 8), поэтому карточка страницы покажет «есть неопубликованные изменения» при идентичном контенте. Публикация/версии не затронуты.
