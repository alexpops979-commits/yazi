'use client';

import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { PALETTE } from '@/blocks/registry';
import type { BlockDefinition } from '@/blocks/types';
import { cn } from '@/components/ui';
import { useEditorStore } from './store';

export function Palette() {
  return (
    <div className="space-y-5">
      <p className="rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] leading-relaxed text-slate-500">
        Перетащите блок на страницу или кликните — он вставится после выделенного.
      </p>
      {PALETTE.map((group) => (
        <div key={group.category}>
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{groupLabel(group.category)}</p>
          <div className="grid grid-cols-2 gap-2">
            {group.items.map((definition) => (
              <PaletteItem key={definition.type} definition={definition} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function groupLabel(category: string): string {
  if (category === 'layout') return 'Раскладка';
  if (category === 'basic') return 'Базовые';
  if (category === 'media') return 'Медиа';
  return 'Маркетинг';
}

function PaletteItem({ definition }: { definition: BlockDefinition }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new:${definition.type}`,
    data: { kind: 'new', type: definition.type },
  });
  const Icon = definition.icon;

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => {
        const state = useEditorStore.getState();
        const target = state.selectedId ?? state.document.sections.at(-1)?.id ?? null;
        state.insertBlock(definition.type, target, 'after');
      }}
      className={cn(
        'flex select-none flex-col items-start gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50/40',
        isDragging && 'opacity-40',
      )}
      title={definition.description ?? definition.title}
    >
      <Icon size={16} className="text-slate-500" />
      <span className="text-[11px] font-medium leading-tight text-slate-700">{definition.title}</span>
    </button>
  );
}

export function DragPreview({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="pointer-events-none flex items-center gap-2 rounded-lg border border-brand-300 bg-white px-3 py-2 text-xs font-medium text-brand-700 shadow-float">
      <GripVertical size={13} />
      {label}
      {hint && <span className="text-slate-400">· {hint}</span>}
    </div>
  );
}
