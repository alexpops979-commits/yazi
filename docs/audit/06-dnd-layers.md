# Аудит 06 — Drag-and-drop редактор и слои

Дата: 2026-11-22. Объект: `apps/web/src/components/editor/*` (+ `store.ts`, `canvas.tsx`, `@dnd-kit/core@6.3.1`).
Методика: статический разбор, чтение исходников dnd-kit, прогон **реального** `store.ts` в Node (ts-node + alias `@/`, без правок репозитория).
UI-тест через браузер **не выполнен**: `browser.tabs.list` → `[browser.disconnected]` (desktop-приложение не подключено). SSR-проверка невозможна — `/editor/...` полностью клиентский (`page.tsx:1`, токен в localStorage).

## Вердикт: PARTIAL

Ядро DnD работает (drag из палитры, click-вставка, перенос, гард циклов), но нет drop-индикатора, нет клавиатурного DnD, а структура документа может стать невалидной по типу (блок вне `section`, потомок у листа).

## Проверки

| # | Проверка | Итог | Доказательства |
|---|---|---|---|
| 1 | DndContext/sensors/collision | PARTIAL | `editor-shell.tsx:57` только `PointerSensor` (distance 5); `:197` `DndContext` без `onDragCancel`, без `KeyboardSensor`/`TouchSensor`; `collisionDetection={pointerWithin}` при **нуле** `useDroppable` во всём `apps/web/src` → детекция мертва, `event.over` всегда `null` |
| 2 | Палитра: useDraggable, клик, before/after/inside | PARTIAL | `palette.tsx:38-41` `useDraggable('new:type')`; `:49-53` клик → `insertBlock(type, selected, 'after')` (позиция не выбирается); `store.ts:158-207` insertBlock; вставка before/after/inside подтверждена харнесом (`insertBefore` → `hea_…,cont1,h2`; `insertInside` → child контейнера) |
| 3 | moveBlock + защита от переноса родителя в себя | PASS | `store.ts:210` `id===target`; `:214` `findNode(moving.children, targetId)` — гард сработал и для прямого ребёнка, и для внука (`A>B>C`: `moveBlock('A','C')` → дерево без изменений) |
| 4 | Слои: рекурсия, ручки, удаление, выбор | PASS | `layers.tsx:14-16` + `:67-69` рекурсия по `children`; `:27-30` `useDraggable('move:id')`; `:54-58` select; `:59-65` remove → `store.ts:242-251` (защита последней секции подтверждена: `sections` остаётся 1) |
| 5 | Drop-логика: elementFromPoint + геометрия | PARTIAL | `editor-shell.tsx:134-139` `activatorEvent.clientX/Y + delta` → `elementFromPoint(...).closest('[data-pb-id]')`; `:150-156` `rel>0.5`→after, `acceptsChildren` + `rel∈(0.25,0.75)`→inside. Харнес: rel 0.10→before, 0.35/0.50/0.65→inside, 0.95→after. Побочно: `delta`/`clientX` подменяются на 0 при KeyboardEvent (`:135`), нет учёта hover-подсветки цели |
| 6 | UI-тест drag из палитры | BLOCKED | Браузер недоступен. Эквивалент на уровне стора: `insertBlock('heading','cont1','before')` → 5→6 блоков, `selectedId` = новый id, `past` +1 (undo вернул 5). Двойной вставки нет: dnd-kit при активации вешает capture-`click`→`stopPropagation` (`core.cjs.development.js:1509`), т.е. drag не дублирует клик |
| 7 | Ограничения: клавиатурный DnD | FAIL | Нет `KeyboardSensor` (следовательно ни `sortableKeyboardCoordinates`) → перенос/сортировка с клавиатуры невозможны; при этом `attributes` `useDraggable` отдают `aria-describedby` с инструкцией «press the space bar» (`core:cjs:48`), т.е. скринридер обещает несуществующее. Enter на кнопке палитры даёт только вставку `after`. Ручка слоя: `opacity-0 group-hover` без `focus-visible` — фокус невидим |

## Найденные дефекты

1. **B1 (high). Блок попадает в корень `document.sections` вне секции.** Палитра с выбранной секцией (`selectedId=sec1`, клик) или drop `before/after` секции идёт в `store.ts:200-203` / `:232-238` (`siblingsOf` = `draft.sections`). Харнес: `rootTypes = ["section","heading"]`; `parseDocument` такой документ **принимает** (`page-schema/src/index.ts:202-205` — `sections: z.array(nodeSchema)`), значит autosave (`pages.service.ts:131`) молча сохранит блок без контейнера/отступов.
2. **B2 (med). Нет `onDragCancel`.** `setDrag(null)` только в `handleDragEnd` (`editor-shell.tsx:130`), а dnd-kit отменяет drag на `pointercancel`, `resize`, `visibilitychange` (`core:1424-1451,1616`) → `DragOverlay` (`:367-369`) остаётся висеть на экране.
3. **B3 (med). `pointerWithin` без droppable + нет индикатора вставки.** Ни `useDroppable`, ни `useSortable` (зависимость `@dnd-kit/sortable` в `apps/web/package.json` не используется) → пользователь не видит, куда именно упадёт блок (before/after/inside), нет подсветки цели, `over` бесполезен.
4. **B4 (med). Стор разрешает `inside` в лист.** `store.ts:196`/`:228` проверяют только `position==='inside'`, тип цели игнорируется. Харнес: `moveBlock('h2','h1','inside')` → `h1.children=[h2]` (heading внутри heading). UI спасает лишь `editor-shell.tsx:153`, т.е. инвариант держится на вызывающем.
5. **B5 (low-med). Нельзя поставить блок рядом с пустым контейнером.** `store.ts:196`/`:228` принудительно `inside`, если `acceptsChildren && !children.length`. Харнес: `moveBlock('h','E','before')` → `h` стал ребёнком `E`.
6. **B6 (low). Тач и панель.** Палитра без `touch-none` (`palette.tsx:55`) — на тач-устройстве жест уйдёт в скролл списка (у ручки слоёв `touch-none` есть, `layers.tsx:49`). Вставка из палитры принудительно переключает левую панель на «Блоки» (`store.ts:206`), даже если drag начат из «Слоёв».
7. **B7 (low). Молчаливый отказ.** Drop вне блоков: для `move` — `return` без уведомления, для `new` — всегда в последнюю секцию «inside» (`editor-shell.tsx:141-145`), т.е. `before/after` игнорируются.
8. **B8 (low). Глобальные Delete/Backspace** удаляют выбранный блок (`editor-shell.tsx:103-108`) без проверки, что фокус в canvas, а не в панели/DnD-состоянии.

## Что работает корректно

- Гард циклов (`store.ts:214`), в т.ч. глубокая вложенность; `moveBlock(id,id)` — no-op.
- Все мутации идут через `mutate` с историей (лимит 60, `store.ts:153`), undo восстанавливает дерево и чистит «мёртвый» `selectedId` (`:303`).
- `DragOverlay` с `pointer-events-none` + `dropAnimation={null}` — `elementFromPoint` не находит оверлей.
- Защита последней секции (`store.ts:247`), рекурсивное удаление вложенного (`removeNested` → `sec1:[h2]`), `duplicateBlock` с новыми id.

## Рекомендации

1. **Сделать drop явным и валидным.** Добавить `useDroppable` на каждый `[data-pb-id]` (или перейти на `@dnd-kit/sortable` + `SortableContext` по каждому уровню), рисовать линию вставки/подсветку `inside`, в `store` ввести `canDrop(target, position)` (inside — только при `acceptsChildren`; before/after у `section` — оборачивать новый узел в секцию, а не пушить в `sections`) и не форсировать `inside` для пустого контейнера.
2. **Закрыть a11y и отмену.** `onDragCancel={() => setDrag(null)}`; `KeyboardSensor` + `sortableKeyboardCoordinates`, `tabs`-навигация по слоям; `touch-action:none` на палитре; `focus-visible` для ручек; после drop объявлять результат (`DragOverlay` + aria-live).
3. **Защитить инварианты и покрыть тестами.** В `mutate` прогонять `pageDocumentSchema.safeParse` (или отдельный `validateTree`: корень — только `section`, `children` — только у `acceptsChildren`) и откатывать мутацию с уведомлением; перенести сценарии харнеса (root-level, empty container, deep cycle, undo) в vitest; убрать `panel:'blocks'` из `insertBlock`.

Итог: механика DnD жива и переносы/вставки в типовых случаях работают (гард циклов, история, слои — ок), но фича не production-ready: нет визуального drop-таргета и клавиатурного управления, а два сценария (drop на секцию и `inside` в лист) портят структуру документа так, что сервер это принимает молча.
