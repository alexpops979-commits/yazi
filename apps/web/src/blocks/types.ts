import type { ComponentType, ReactNode } from 'react';
import type { Device, PageNode, StyleProps, Theme } from '@yazi/page-schema';

export type RenderMode = 'editor' | 'preview' | 'published';

export type RenderContext = {
  mode: RenderMode;
  device: Device;
  theme: Theme;
  editingId?: string | null;
  onTextCommit?: (nodeId: string, field: string, value: string) => void;
  onEditEnd?: () => void;
};

export type BlockProps = Record<string, unknown>;

export type BlockRenderArgs = {
  node: PageNode;
  props: BlockProps;
  style: StyleProps;
  children?: ReactNode;
  ctx: RenderContext;
};

export type Control =
  | { kind: 'text' | 'url' | 'color' | 'number'; key: string; label: string; placeholder?: string; min?: number; max?: number; step?: number }
  | { kind: 'textarea'; key: string; label: string; placeholder?: string; rows?: number }
  | { kind: 'select'; key: string; label: string; options: { label: string; value: string | number }[] }
  | { kind: 'toggle'; key: string; label: string }
  | { kind: 'image'; key: string; label: string }
  | { kind: 'links'; key: string; label: string }
  | { kind: 'fields'; key: string; label: string };

export type BlockCategory = 'layout' | 'basic' | 'media' | 'marketing';

export type BlockDefinition = {
  type: string;
  title: string;
  category: BlockCategory;
  icon: ComponentType<{ size?: number; className?: string }>;
  description?: string;
  defaultProps: BlockProps;
  defaultStyle?: StyleProps;
  acceptsChildren?: boolean;
  controls: Control[];
  render: (args: BlockRenderArgs) => ReactNode;
};

export function blockClass(node: PageNode, extra = ''): string {
  return `pb-${node.id} ${extra}`.trim();
}

export function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function parseLines(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => (typeof item === 'string' ? item : '')).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export type NavLink = { label: string; href: string };

function splitLink(line: string): NavLink {
  const [label, href] = line.split('|');
  return { label: (label ?? '').trim(), href: (href ?? '#').trim() };
}

/** Accepts both the canonical text form ("Label|/path" per line) and legacy arrays. */
export function parseLinks(value: unknown): NavLink[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return splitLink(item);
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          return { label: String(record.label ?? ''), href: String(record.href ?? '#') };
        }
        return { label: '', href: '#' };
      })
      .filter((link) => link.label.length > 0);
  }
  return parseLines(value).map(splitLink);
}

/** Serializes arrays of objects back into "Label|/path" lines for the inspector. */
export function collectionToText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const first = record.label ?? record.name ?? '';
          const second = record.href ?? record.url ?? '';
          return [first, second].filter(Boolean).join('|');
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return typeof value === 'string' ? value : '';
}

export function parseFields(value: unknown): { name: string; label: string; type: string }[] {
  const toField = (line: string) => {
    const [rawName, rawLabel] = line.split('|');
    const label = (rawLabel ?? rawName ?? '').trim();
    const name = (rawName ?? 'field').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    const type = /e-?mail|почта/i.test(label) ? 'email' : /phone|тел/i.test(label) ? 'tel' : name === 'message' ? 'textarea' : 'text';
    return { name, label, type };
  };
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : ''))
      .filter(Boolean)
      .map(toField);
  }
  return parseLines(value).map(toField);
}
