'use client';

import { useMemo } from 'react';
import { documentCss } from '@/blocks/css';
import { PageRenderer } from '@/blocks/render';
import { useEditorStore } from './store';

const DEVICE_WIDTH: Record<string, number | null> = { mobile: 390, tablet: 820, desktop: null };

export function Canvas() {
  const document = useEditorStore((state) => state.document);
  const device = useEditorStore((state) => state.device);
  const zoom = useEditorStore((state) => state.zoom);
  const selectedId = useEditorStore((state) => state.selectedId);
  const hoveredId = useEditorStore((state) => state.hoveredId);
  const editingId = useEditorStore((state) => state.editingId);
  const select = useEditorStore((state) => state.select);
  const hover = useEditorStore((state) => state.hover);
  const setEditing = useEditorStore((state) => state.setEditing);
  const updateProps = useEditorStore((state) => state.updateProps);

  const css = useMemo(() => documentCss(document), [document]);
  const outlineCss = useMemo(() => {
    const rules: string[] = [];
    if (selectedId) rules.push(`[data-pb-id="${selectedId}"]{outline:2px solid #3462F4 !important;outline-offset:-2px}`);
    if (hoveredId && hoveredId !== selectedId) rules.push(`[data-pb-id="${hoveredId}"]{outline:1px solid rgba(52,98,244,.55) !important;outline-offset:-1px}`);
    return rules.join('\n');
  }, [selectedId, hoveredId]);

  const width = DEVICE_WIDTH[device];

  return (
    <div className="min-h-full px-6 py-8">
      <style>{css}</style>
      <style>{outlineCss}</style>
      <div
        className="mx-auto overflow-hidden rounded-xl border border-slate-300 shadow-[0_20px_60px_rgba(15,23,42,.14)]"
        style={{ width: width ?? '100%', maxWidth: '100%', zoom, backgroundColor: '#ffffff' }}
      >
        <div
          onClick={(event) => {
            if (editingId) return;
            const element = (event.target as HTMLElement).closest('[data-pb-id]') as HTMLElement | null;
            select(element?.dataset.pbId ?? null);
          }}
          onMouseOver={(event) => {
            const element = (event.target as HTMLElement).closest('[data-pb-id]') as HTMLElement | null;
            hover(element?.dataset.pbId ?? null);
          }}
          onMouseLeave={() => hover(null)}
          onDoubleClick={(event) => {
            const editable = (event.target as HTMLElement).closest('[data-pb-editable]') as HTMLElement | null;
            const wrapper = editable?.closest('[data-pb-id]') as HTMLElement | null;
            if (!editable || !wrapper) return;
            event.stopPropagation();
            select(wrapper.dataset.pbId ?? null);
            setEditing(wrapper.dataset.pbId ?? null);
            window.requestAnimationFrame(() => {
              editable.focus();
              const selection = window.getSelection();
              if (selection) {
                const range = window.document.createRange();
                range.selectNodeContents(editable);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
              }
            });
          }}
        >
          {document.sections.length ? (
            <PageRenderer
              document={document}
              ctx={{
                mode: 'editor',
                device,
                theme: document.theme,
                editingId,
                onTextCommit: (nodeId, field, value) => {
                  updateProps(nodeId, { [field]: value });
                },
                onEditEnd: () => setEditing(null),
              }}
            />
          ) : (
            <div className="grid h-64 place-items-center text-sm text-slate-400">Перетащите блок из панели слева</div>
          )}
        </div>
      </div>
    </div>
  );
}
