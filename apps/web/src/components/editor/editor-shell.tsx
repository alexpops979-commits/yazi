'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, pointerWithin, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  ArrowLeft,
  Blocks,
  Eye,
  Layers as LayersIcon,
  Monitor,
  Palette as PaletteIcon,
  Redo2,
  Rocket,
  Settings2,
  Smartphone,
  Tablet,
  Undo2,
} from 'lucide-react';
import type { PageDetail, ProjectSummary } from '@dalmg/contracts';
import { findNode } from '@dalmg/page-schema';
import { getBlockDefinition } from '@/blocks/registry';
import { Alert, Badge, Button, Modal, Spinner, cn } from '@/components/ui';
import { ThemeToggle } from '@/components/theme-toggle';
import { useApi } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Canvas } from './canvas';
import { Inspector, PageSettings } from './inspector';
import { Layers } from './layers';
import { DragPreview, Palette } from './palette';
import { ThemePanel } from './theme-panel';
import { useEditorStore, type DropPosition } from './store';

type DragPayload = { kind: 'new' | 'move'; type?: string; id?: string; label: string };

export function EditorShell({ page, project, reload }: { page: PageDetail; project: ProjectSummary | null; reload: () => Promise<void> }) {
  const api = useApi();
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const doc = useEditorStore((state) => state.document);
  const dirty = useEditorStore((state) => state.dirty);
  const saving = useEditorStore((state) => state.saving);
  const savedAt = useEditorStore((state) => state.savedAt);
  const revision = useEditorStore((state) => state.revision);
  const conflict = useEditorStore((state) => state.conflict);
  const device = useEditorStore((state) => state.device);
  const zoom = useEditorStore((state) => state.zoom);
  const panel = useEditorStore((state) => state.panel);
  const inspectorTab = useEditorStore((state) => state.inspectorTab);
  const selectedId = useEditorStore((state) => state.selectedId);
  const canUndo = useEditorStore((state) => state.past.length > 0);
  const canRedo = useEditorStore((state) => state.future.length > 0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const save = useCallback(async () => {
    const state = useEditorStore.getState();
    if (!state.dirty || state.saving || state.conflict) return;
    state.markSaving();
    try {
      const result = await api<{ revision: number; savedAt: string }>(`/pages/${page.id}/draft`, {
        method: 'POST',
        body: { document: state.document, revision: state.revision },
      });
      useEditorStore.getState().markSaved(result.revision);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        const details = caught.details as { revision: number; document: PageDetail['document'] } | undefined;
        if (details) useEditorStore.getState().setConflict({ revision: details.revision, document: details.document });
      } else {
        useEditorStore.getState().markSaved(state.revision);
        setError(caught instanceof Error ? caught.message : 'Не удалось сохранить');
      }
    }
  }, [api, page.id]);

  // Autosave: debounce after edits stop.
  useEffect(() => {
    if (!dirty || conflict) return;
    const timer = window.setTimeout(() => {
      void save();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [doc, dirty, conflict, save]);

  // Keyboard shortcuts.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'z') {
        if (typing) return;
        event.preventDefault();
        if (event.shiftKey) useEditorStore.getState().redo();
        else useEditorStore.getState().undo();
      } else if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save();
      } else if (!typing && (event.key === 'Delete' || event.key === 'Backspace')) {
        const state = useEditorStore.getState();
        if (state.selectedId) {
          event.preventDefault();
          state.removeBlock(state.selectedId);
        }
      } else if (event.key === 'Escape') {
        useEditorStore.getState().setEditing(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save]);

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { kind: 'new' | 'move'; type?: string; id?: string } | undefined;
    if (!data) return;
    if (data.kind === 'new' && data.type) {
      setDrag({ kind: 'new', type: data.type, label: getBlockDefinition(data.type)?.title ?? data.type });
    } else if (data.kind === 'move' && data.id) {
      const node = findNode(useEditorStore.getState().document.sections, data.id);
      setDrag({ kind: 'move', id: data.id, label: node ? (getBlockDefinition(node.type)?.title ?? node.type) : 'Блок' });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const data = event.active.data.current as { kind: 'new' | 'move'; type?: string; id?: string } | undefined;
    setDrag(null);
    if (!data) return;

    const state = useEditorStore.getState();

    // Keyboard drags have no pointer coordinates: drop relative to the selection.
    if (typeof window !== 'undefined' && event.activatorEvent instanceof KeyboardEvent) {
      const targetId = state.selectedId ?? state.document.sections.at(-1)?.id ?? null;
      if (data.kind === 'new' && data.type) state.insertBlock(data.type, targetId, 'after');
      else if (data.kind === 'move' && data.id && targetId) state.moveBlock(data.id, targetId, 'after');
      return;
    }

    const activator = event.activatorEvent as PointerEvent | undefined;
    const x = (activator?.clientX ?? 0) + event.delta.x;
    const y = (activator?.clientY ?? 0) + event.delta.y;
    const element = window.document.elementFromPoint(x, y) as HTMLElement | null;
    const targetEl = element?.closest('[data-pb-id]') as HTMLElement | null;
    const targetId = targetEl?.dataset.pbId ?? null;

    if (!targetId) {
      const lastSection = state.document.sections.at(-1);
      if (data.kind === 'new' && data.type) state.insertBlock(data.type, lastSection?.id ?? null, 'inside');
      return;
    }

    const node = findNode(state.document.sections, targetId);
    const definition = node ? getBlockDefinition(node.type) : null;
    const rect = targetEl?.getBoundingClientRect();
    const rel = rect && rect.height > 0 ? (y - rect.top) / rect.height : 0.5;

    let position: DropPosition = rel > 0.5 ? 'after' : 'before';
    if (definition?.acceptsChildren) {
      const empty = !node?.children?.length;
      if (empty || (rel > 0.25 && rel < 0.75)) position = 'inside';
    }

    if (data.kind === 'new' && data.type) state.insertBlock(data.type, targetId, position);
    else if (data.kind === 'move' && data.id) state.moveBlock(data.id, targetId, position);
  }

  async function openPreview() {
    await save();
    try {
      const { token } = await api<{ token: string }>(`/pages/${page.id}/preview-token`, { method: 'POST', body: {} });
      window.open(`/preview/${token}`, '_blank', 'noopener');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось открыть preview');
    }
  }

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      await save();
      await api(`/pages/${page.id}/publish`, { method: 'POST', body: { note: 'Опубликовано из редактора' } });
      await reload();
      setToast('Страница опубликована');
      window.setTimeout(() => setToast(null), 3000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Публикация не удалась');
    } finally {
      setPublishing(false);
    }
  }

  const selectedTitle = useMemo(() => {
    if (!selectedId) return null;
    const node = findNode(doc.sections, selectedId);
    return node ? getBlockDefinition(node.type)?.title ?? node.type : null;
  }, [doc, selectedId]);

  const savedLabel = saving ? 'Сохранение…' : dirty ? 'Есть несохранённые изменения' : savedAt ? `Сохранено ${new Date(savedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : 'Без изменений';

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDrag(null)}>
      <div className="flex h-screen flex-col bg-[#F5F6FA]">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3">
          <Link href={`/projects/${page.projectId}`} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" title="К проекту">
            <ArrowLeft size={17} />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{project?.name ?? 'Проект'}</p>
            <p className="truncate text-[11px] text-slate-500">{page.title} · <span className="font-mono">{page.path}</span></p>
          </div>
          <div className="ml-2 flex items-center gap-1">
            {page.status === 'PUBLISHED' ? <Badge tone="green">опубликовано</Badge> : <Badge tone="amber">черновик</Badge>}
            <span className="hidden text-[11px] text-slate-400 lg:inline">rev {revision}</span>
          </div>

          <div className="mx-auto flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {[
              { value: 'desktop' as const, icon: Monitor },
              { value: 'tablet' as const, icon: Tablet },
              { value: 'mobile' as const, icon: Smartphone },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  onClick={() => useEditorStore.getState().setDevice(item.value)}
                  className={cn('rounded-md p-1.5 transition', device === item.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
                  title={item.value}
                >
                  <Icon size={15} />
                </button>
              );
            })}
            <select
              value={zoom}
              onChange={(event) => useEditorStore.getState().setZoom(Number(event.target.value))}
              className="ml-1 rounded-md border-0 bg-transparent px-1 text-[11px] text-slate-600 outline-none"
            >
              {[0.5, 0.75, 1].map((value) => (
                <option key={value} value={value}>{Math.round(value * 100)}%</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              onClick={() => useEditorStore.getState().undo()}
              disabled={!canUndo}
              title="Отменить (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </button>
            <button
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              onClick={() => useEditorStore.getState().redo()}
              disabled={!canRedo}
              title="Повторить (Ctrl+Shift+Z)"
            >
              <Redo2 size={16} />
            </button>
            <span className="mx-1 hidden text-[11px] text-slate-400 xl:inline">{savedLabel}</span>
            <ThemeToggle className="dark:text-slate-300" />
            <Button size="sm" variant="secondary" onClick={openPreview}>
              <Eye size={14} /> Preview
            </Button>
            <Button size="sm" onClick={publish} loading={publishing}>
              <Rocket size={14} /> Опубликовать
            </Button>
          </div>
        </header>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-3 py-2">
            <Alert>{error}</Alert>
          </div>
        )}
        {toast && (
          <div className="border-b border-emerald-100 bg-emerald-50 px-3 py-2">
            <Alert tone="green">{toast}</Alert>
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[264px] shrink-0 flex-col border-r border-slate-200 bg-white">
            <div className="flex border-b border-slate-100">
              {[
                { value: 'blocks' as const, icon: Blocks, label: 'Блоки' },
                { value: 'layers' as const, icon: LayersIcon, label: 'Слои' },
                { value: 'theme' as const, icon: PaletteIcon, label: 'Тема' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.value}
                    onClick={() => useEditorStore.getState().setPanel(item.value)}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition',
                      panel === item.value ? 'border-b-2 border-brand-500 text-brand-600' : 'text-slate-400 hover:text-slate-700',
                    )}
                  >
                    <Icon size={15} />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {panel === 'blocks' && <Palette />}
              {panel === 'layers' && <Layers />}
              {panel === 'theme' && <ThemePanel />}
            </div>
          </aside>

          <main className="min-h-0 flex-1 overflow-auto bg-[#EEF1F6]">
            <div className="mx-auto w-full max-w-[1400px]">
              <Canvas />
            </div>
          </main>

          <aside className="flex w-[288px] shrink-0 flex-col border-l border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-2 py-2">
              <div className="flex gap-1">
                <button
                  onClick={() => useEditorStore.getState().setInspectorTab('design')}
                  className={cn('rounded-md px-2.5 py-1 text-[11px] font-medium transition', inspectorTab === 'design' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}
                >
                  {selectedTitle ?? 'Дизайн'}
                </button>
                <button
                  onClick={() => useEditorStore.getState().setInspectorTab('page')}
                  className={cn('rounded-md px-2.5 py-1 text-[11px] font-medium transition', inspectorTab === 'page' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}
                >
                  <Settings2 size={12} className="mr-1 inline" />
                  Страница
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {inspectorTab === 'design' ? (
                <Inspector />
              ) : (
                <PageSettings
                  saving={savingMeta}
                  onSave={async (meta) => {
                    setSavingMeta(true);
                    setError(null);
                    try {
                      await api(`/pages/${page.id}`, { method: 'PATCH', body: meta });
                      await reload();
                    } catch (caught) {
                      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить');
                    } finally {
                      setSavingMeta(false);
                    }
                  }}
                />
              )}
            </div>
          </aside>
        </div>

        <footer className="flex h-7 shrink-0 items-center justify-between border-t border-slate-200 bg-white px-3 text-[10px] text-slate-400">
          <span>{savedLabel}</span>
          <span className="flex items-center gap-1.5">
            {saving && <Spinner className="h-2.5 w-2.5" />}
            {selectedId ? `Блок ${selectedId}` : 'Ничего не выбрано'}
          </span>
        </footer>
      </div>

      <DragOverlay dropAnimation={null}>
        {drag ? <div className="pointer-events-none"><DragPreview label={drag.label} hint={drag.kind === 'new' ? 'новый блок' : 'перемещение'} /></div> : null}
      </DragOverlay>

      <Modal
        open={!!conflict}
        onClose={() => useEditorStore.getState().setConflict(null)}
        title="Страница изменена в другой вкладке"
        description="Чтобы ничего не потерять, выберите версию."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                const current = useEditorStore.getState().conflict;
                if (!current) return;
                useEditorStore.getState().resetFromServer(current.document, current.revision);
              }}
            >
              Загрузить серверную
            </Button>
            <Button
              onClick={() => {
                const current = useEditorStore.getState().conflict;
                if (!current) return;
                useEditorStore.setState({ revision: current.revision, conflict: null, dirty: true });
                window.setTimeout(() => void save(), 50);
              }}
            >
              Перезаписать моей
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Сервер принял более новую версию (rev {conflict?.revision}). «Перезаписать моей» сохранит текущий документ поверх неё.
        </p>
      </Modal>
    </DndContext>
  );
}
