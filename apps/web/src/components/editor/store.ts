'use client';

import { create } from 'zustand';
import { produce } from 'immer';
import {
  cloneNodeWithNewIds,
  createId,
  findNode,
  type Device,
  type PageDocument,
  type PageNode,
  type StyleProps,
  type Theme,
} from '@dalmg/page-schema';
import { getBlockDefinition } from '@/blocks/registry';

export type DropPosition = 'before' | 'after' | 'inside';

type Conflict = { document: PageDocument; revision: number } | null;

type EditorState = {
  projectId: string;
  pageId: string;
  document: PageDocument;
  revision: number;
  title: string;
  path: string;

  selectedId: string | null;
  hoveredId: string | null;
  editingId: string | null;
  device: Device;
  zoom: number;
  panel: 'blocks' | 'layers' | 'theme';
  inspectorTab: 'design' | 'page';

  dirty: boolean;
  saving: boolean;
  savedAt: string | null;
  conflict: Conflict;

  past: PageDocument[];
  future: PageDocument[];

  init: (input: { projectId: string; pageId: string; document: PageDocument; revision: number; title: string; path: string }) => void;
  resetFromServer: (document: PageDocument, revision: number) => void;
  setTitle: (title: string) => void;
  setPath: (path: string) => void;
  setDevice: (device: Device) => void;
  setZoom: (zoom: number) => void;
  setPanel: (panel: EditorState['panel']) => void;
  setInspectorTab: (tab: EditorState['inspectorTab']) => void;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  setEditing: (id: string | null) => void;

  mutate: (recipe: (draft: PageDocument) => void, options?: { history?: boolean }) => void;
  insertBlock: (type: string, targetId: string | null, position: DropPosition) => void;
  moveBlock: (id: string, targetId: string, position: DropPosition) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  updateProps: (id: string, patch: Record<string, unknown>) => void;
  updateStyle: (id: string, patch: StyleProps) => void;
  updateTheme: (patch: Partial<Theme>) => void;
  undo: () => void;
  redo: () => void;
  markSaving: () => void;
  markSaved: (revision: number) => void;
  setConflict: (conflict: Conflict) => void;
  markDirty: () => void;
};

function parentOf(nodes: PageNode[], id: string): PageNode | null {
  for (const node of nodes) {
    if (node.children?.some((child) => child.id === id)) return node;
    if (node.children?.length) {
      const found = parentOf(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function siblingsOf(sections: PageNode[], id: string): PageNode[] {
  const parent = parentOf(sections, id);
  return parent ? (parent.children ?? []) : sections;
}

function acceptsChildren(type: string): boolean {
  return getBlockDefinition(type)?.acceptsChildren === true;
}

function wrapInSection(node: PageNode): PageNode {
  return {
    id: createId('sec'),
    type: 'section',
    props: { tag: 'section', container: true },
    style: { padding: { base: [64, 24, 64, 24] } },
    children: [node],
  };
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  projectId: '',
  pageId: '',
  document: { schemaVersion: 1, theme: { colors: { primary: '#3462F4', primaryContrast: '#FFFFFF', text: '#0F172A', muted: '#64748B', background: '#FFFFFF', surface: '#F6F8FC', border: '#E2E8F0' }, fonts: { heading: 'Inter', body: 'Inter' }, radius: 12, containerWidth: 1120 }, sections: [] },
  revision: 0,
  title: '',
  path: '/',

  selectedId: null,
  hoveredId: null,
  editingId: null,
  device: 'desktop',
  zoom: 1,
  panel: 'blocks',
  inspectorTab: 'design',

  dirty: false,
  saving: false,
  savedAt: null,
  conflict: null,

  past: [],
  future: [],

  init: ({ projectId, pageId, document, revision, title, path }) =>
    set({
      projectId,
      pageId,
      document,
      revision,
      title,
      path,
      selectedId: document.sections[0]?.children?.[0]?.id ?? document.sections[0]?.id ?? null,
      dirty: false,
      savedAt: null,
      past: [],
      future: [],
      conflict: null,
    }),

  resetFromServer: (document, revision) => set({ document, revision, dirty: false, conflict: null, past: [], future: [] }),

  setTitle: (title) => set({ title, dirty: true }),
  setPath: (path) => set({ path, dirty: true }),
  setDevice: (device) => set({ device }),
  setZoom: (zoom) => set({ zoom }),
  setPanel: (panel) => set({ panel }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
  select: (selectedId) => set({ selectedId, editingId: null }),
  hover: (hoveredId) => set({ hoveredId }),
  setEditing: (editingId) => set({ editingId }),

  mutate: (recipe, options) =>
    set((state) => {
      const next = produce(state.document, recipe);
      if (next === state.document) return state;
      return {
        document: next,
        dirty: true,
        past: options?.history === false ? state.past : [...state.past.slice(-59), state.document],
        future: options?.history === false ? state.future : [],
      };
    }),

  insertBlock: (type, targetId, position) => {
    const definition = getBlockDefinition(type);
    if (!definition) return;
    const node: PageNode = {
      id: createId(type.slice(0, 3)),
      type,
      props: clone(definition.defaultProps),
      style: clone(definition.defaultStyle ?? {}),
      ...(definition.acceptsChildren ? { children: [] } : {}),
    };

    get().mutate((draft) => {
      if (!targetId) {
        draft.sections.push(node.type === 'section' ? node : wrapInSection(node));
        return;
      }
      const target = findNode(draft.sections, targetId);
      if (!target) {
        draft.sections.push(node.type === 'section' ? node : wrapInSection(node));
        return;
      }

      let placement: DropPosition = position;
      if (placement === 'inside' && !acceptsChildren(target.type)) placement = 'after';
      // Only sections live at the document root.
      if (target.type === 'section' && placement !== 'inside' && node.type !== 'section') placement = 'inside';
      if (node.type === 'section' && placement === 'inside') placement = 'after';

      if (placement === 'inside') {
        target.children = [...(target.children ?? []), node];
        return;
      }

      const siblings = siblingsOf(draft.sections, target.id);
      const index = siblings.findIndex((item) => item.id === target.id);
      if (index === -1) return;
      siblings.splice(placement === 'before' ? index : index + 1, 0, node);
    });

    set({ selectedId: node.id, panel: 'blocks' });
  },

  moveBlock: (id, targetId, position) => {
    if (id === targetId) return;
    const state = get();
    const moving = findNode(state.document.sections, id);
    if (!moving) return;
    if (findNode(moving.children ?? [], targetId)) return; // cannot move a parent into itself

    get().mutate((draft) => {
      const siblings = siblingsOf(draft.sections, id);
      const index = siblings.findIndex((item) => item.id === id);
      if (index === -1) return;
      const [node] = siblings.splice(index, 1);
      if (!node) return;

      const target = findNode(draft.sections, targetId);
      if (!target) {
        draft.sections.push(node);
        return;
      }

      let placement: DropPosition = position;
      if (placement === 'inside' && !acceptsChildren(target.type)) placement = 'after';
      if (target.type === 'section' && placement !== 'inside' && node.type !== 'section') placement = 'inside';
      if (node.type === 'section' && placement === 'inside') placement = 'after';

      if (placement === 'inside') {
        target.children = [...(target.children ?? []), node];
        return;
      }
      const targetSiblings = siblingsOf(draft.sections, target.id);
      const targetIndex = targetSiblings.findIndex((item) => item.id === target.id);
      if (targetIndex === -1) {
        draft.sections.push(node);
        return;
      }
      targetSiblings.splice(placement === 'before' ? targetIndex : targetIndex + 1, 0, node);
    });
  },

  removeBlock: (id) => {
    get().mutate((draft) => {
      const siblings = siblingsOf(draft.sections, id);
      const index = siblings.findIndex((item) => item.id === id);
      if (index === -1) return;
      if (draft.sections.length === 1 && draft.sections[0]?.id === id) return; // keep the last section
      siblings.splice(index, 1);
    });
    set({ selectedId: null, editingId: null });
  },

  duplicateBlock: (id) => {
    const state = get();
    const source = findNode(state.document.sections, id);
    if (!source) return;
    const copy = cloneNodeWithNewIds(source);
    get().mutate((draft) => {
      if (source.type === 'section') {
        draft.sections.push(copy);
        return;
      }
      const siblings = siblingsOf(draft.sections, id);
      const index = siblings.findIndex((item) => item.id === id);
      siblings.splice(index + 1, 0, copy);
    });
    set({ selectedId: copy.id });
  },

  updateProps: (id, patch) =>
    get().mutate((draft) => {
      const node = findNode(draft.sections, id);
      if (!node) return;
      node.props = { ...node.props, ...patch };
    }),

  updateStyle: (id, patch) =>
    get().mutate((draft) => {
      const node = findNode(draft.sections, id);
      if (!node) return;
      node.style = { ...node.style, ...patch };
    }),

  updateTheme: (patch) =>
    get().mutate((draft) => {
      draft.theme = {
        ...draft.theme,
        ...patch,
        colors: { ...draft.theme.colors, ...(patch.colors ?? {}) },
        fonts: { ...draft.theme.fonts, ...(patch.fonts ?? {}) },
      };
    }),

  undo: () =>
    set((state) => {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        document: previous,
        past: state.past.slice(0, -1),
        future: [state.document, ...state.future].slice(0, 60),
        dirty: true,
        selectedId: state.selectedId && findNode(previous.sections, state.selectedId) ? state.selectedId : null,
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) return state;
      return {
        document: next,
        past: [...state.past, state.document],
        future: state.future.slice(1),
        dirty: true,
      };
    }),

  markSaving: () => set({ saving: true }),
  markSaved: (revision) => set({ saving: false, dirty: false, revision, savedAt: new Date().toISOString(), conflict: null }),
  setConflict: (conflict) => set({ conflict, saving: false }),
  markDirty: () => set({ dirty: true }),
}));
