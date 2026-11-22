'use client';

import { useDraggable } from '@dnd-kit/core';
import { ChevronRight, GripVertical, Trash2 } from 'lucide-react';
import type { PageNode } from '@dalmg/page-schema';
import { getBlockDefinition } from '@/blocks/registry';
import { cn } from '@/components/ui';
import { useEditorStore } from './store';

export function Layers() {
  const document = useEditorStore((state) => state.document);
  return (
    <div className="space-y-1">
      {document.sections.map((section) => (
        <LayerRow key={section.id} node={section} depth={0} />
      ))}
      {!document.sections.length && <p className="px-2 py-6 text-center text-xs text-slate-400">Пустая страница</p>}
    </div>
  );
}

function LayerRow({ node, depth }: { node: PageNode; depth: number }) {
  const selectedId = useEditorStore((state) => state.selectedId);
  const select = useEditorStore((state) => state.select);
  const removeBlock = useEditorStore((state) => state.removeBlock);
  const definition = getBlockDefinition(node.type);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `move:${node.id}`,
    data: { kind: 'move', id: node.id },
  });
  const Icon = definition?.icon;
  const label = nodeLabel(node);
  const selected = selectedId === node.id;

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md pr-1 transition',
          selected ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50',
          isDragging && 'opacity-40',
        )}
        style={{ paddingLeft: 6 + depth * 12 }}
      >
        <button
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className="cursor-grab touch-none p-1 text-slate-300 opacity-0 transition group-hover:opacity-100"
          title="Перетащить"
        >
          <GripVertical size={12} />
        </button>
        <button onClick={() => select(node.id)} className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left">
          {depth === 0 && <ChevronRight size={11} className="text-slate-300" />}
          {Icon && <Icon size={12} className="shrink-0 text-slate-400" />}
          <span className={cn('truncate text-[11px]', selected && 'font-medium')}>{label}</span>
        </button>
        <button
          onClick={() => removeBlock(node.id)}
          className="p-1 text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
          title="Удалить"
        >
          <Trash2 size={11} />
        </button>
      </div>
      {node.children?.map((child) => (
        <LayerRow key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function nodeLabel(node: PageNode): string {
  const props = node.props as Record<string, unknown>;
  const text = typeof props.text === 'string' ? props.text : typeof props.label === 'string' ? props.label : typeof props.brand === 'string' ? props.brand : '';
  const definition = getBlockDefinition(node.type);
  const title = definition?.title ?? node.type;
  if (!text) return title;
  return `${title} — ${text.slice(0, 24)}${text.length > 24 ? '…' : ''}`;
}
