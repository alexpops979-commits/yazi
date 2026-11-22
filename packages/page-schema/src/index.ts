import { ZodError, z } from 'zod';

/* ────────────────────────────────────────────────────────────
 *  Devices & responsive values
 * ──────────────────────────────────────────────────────────── */

export const DEVICES = ['mobile', 'tablet', 'desktop'] as const;
export type Device = (typeof DEVICES)[number];

export type Responsive<T> = {
  base?: T;
  mobile?: T;
  tablet?: T;
  desktop?: T;
};

/**
 * Cascade: base is inherited by every device, tablet overrides base,
 * mobile overrides tablet. Desktop is the "natural" size.
 */
export function resolveResponsive<T>(value: Responsive<T> | undefined, device: Device): T | undefined {
  if (!value) return undefined;
  if (device === 'mobile') return value.mobile ?? value.tablet ?? value.base;
  if (device === 'tablet') return value.tablet ?? value.base;
  return value.desktop ?? value.base;
}

const responsive = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    base: schema.optional(),
    mobile: schema.optional(),
    tablet: schema.optional(),
    desktop: schema.optional(),
  });

export const SPACING_PRESETS = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  '2xl': 64,
  '3xl': 96,
} as const;

/* ────────────────────────────────────────────────────────────
 *  Style model
 * ──────────────────────────────────────────────────────────── */

export type Spacing = number | [number, number, number, number];

export type StyleProps = {
  padding?: Responsive<Spacing>;
  margin?: Responsive<Spacing>;
  gap?: Responsive<number>;
  background?: Responsive<string>;
  color?: Responsive<string>;
  fontSize?: Responsive<number>;
  fontWeight?: Responsive<number>;
  lineHeight?: Responsive<number>;
  letterSpacing?: Responsive<number>;
  textAlign?: Responsive<'left' | 'center' | 'right'>;
  radius?: Responsive<number>;
  maxWidth?: Responsive<number>;
  minHeight?: Responsive<number>;
  align?: Responsive<'start' | 'center' | 'end' | 'stretch'>;
  justify?: Responsive<'start' | 'center' | 'end' | 'between'>;
  borderColor?: Responsive<string>;
  borderWidth?: Responsive<number>;
  shadow?: Responsive<'none' | 'sm' | 'md' | 'lg'>;
  opacity?: Responsive<number>;
  hidden?: Device[];
};

const spacingValue = z.union([
  z.number(),
  z.tuple([z.number(), z.number(), z.number(), z.number()]),
]);

export const styleSchema: z.ZodType<StyleProps> = z
  .object({
    padding: responsive(spacingValue),
    margin: responsive(spacingValue),
    gap: responsive(z.number()),
    background: responsive(z.string()),
    color: responsive(z.string()),
    fontSize: responsive(z.number()),
    fontWeight: responsive(z.number()),
    lineHeight: responsive(z.number()),
    letterSpacing: responsive(z.number()),
    textAlign: responsive(z.enum(['left', 'center', 'right'])),
    radius: responsive(z.number()),
    maxWidth: responsive(z.number()),
    minHeight: responsive(z.number()),
    align: responsive(z.enum(['start', 'center', 'end', 'stretch'])),
    justify: responsive(z.enum(['start', 'center', 'end', 'between'])),
    borderColor: responsive(z.string()),
    borderWidth: responsive(z.number()),
    shadow: responsive(z.enum(['none', 'sm', 'md', 'lg'])),
    opacity: responsive(z.number()),
    hidden: z.array(z.enum(DEVICES)).optional(),
  })
  .partial() as z.ZodType<StyleProps>;

/* ────────────────────────────────────────────────────────────
 *  Document tree
 * ──────────────────────────────────────────────────────────── */

export type PageNode = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  style: StyleProps;
  children?: PageNode[];
};

export const nodeSchema: z.ZodType<PageNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    props: z.record(z.unknown()),
    style: styleSchema,
    children: z.array(nodeSchema).optional(),
  }),
);

/* ────────────────────────────────────────────────────────────
 *  Theme
 * ──────────────────────────────────────────────────────────── */

export type Theme = {
  colors: {
    primary: string;
    primaryContrast: string;
    text: string;
    muted: string;
    background: string;
    surface: string;
    border: string;
  };
  fonts: { heading: string; body: string };
  radius: number;
  containerWidth: number;
};

export const DEFAULT_THEME: Theme = {
  colors: {
    primary: '#3462F4',
    primaryContrast: '#FFFFFF',
    text: '#0F172A',
    muted: '#64748B',
    background: '#FFFFFF',
    surface: '#F6F8FC',
    border: '#E2E8F0',
  },
  fonts: { heading: 'Inter', body: 'Inter' },
  radius: 12,
  containerWidth: 1120,
};

export const FONT_OPTIONS = [
  'Inter',
  'Manrope',
  'DM Sans',
  'Space Grotesk',
  'Montserrat',
  'Poppins',
  'Playfair Display',
  'Lora',
  'Roboto Slab',
  'Fira Sans',
] as const;

export const themeSchema: z.ZodType<Theme> = z.object({
  colors: z.object({
    primary: z.string(),
    primaryContrast: z.string(),
    text: z.string(),
    muted: z.string(),
    background: z.string(),
    surface: z.string(),
    border: z.string(),
  }),
  fonts: z.object({ heading: z.string(), body: z.string() }),
  radius: z.number().min(0).max(64),
  containerWidth: z.number().min(600).max(1920),
});

/* ────────────────────────────────────────────────────────────
 *  Page document
 * ──────────────────────────────────────────────────────────── */

export const SCHEMA_VERSION = 1;

export type PageDocument = {
  schemaVersion: number;
  theme: Theme;
  sections: PageNode[];
};

export const pageDocumentSchema: z.ZodType<PageDocument> = z.object({
  schemaVersion: z.number().int().min(1),
  theme: themeSchema,
  sections: z.array(nodeSchema),
});

/* ────────────────────────────────────────────────────────────
 *  Ids
 * ──────────────────────────────────────────────────────────── */

let counter = 0;
export function createId(prefix = 'n'): string {
  const rand =
    typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto
      ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  counter = (counter + 1) % 1000;
  return `${prefix}_${rand}${counter}`;
}

/* ────────────────────────────────────────────────────────────
 *  Tree helpers (immutable)
 * ──────────────────────────────────────────────────────────── */

export function walkNodes(nodes: PageNode[], visit: (node: PageNode, parent: PageNode | null) => void, parent: PageNode | null = null): void {
  for (const node of nodes) {
    visit(node, parent);
    if (node.children?.length) walkNodes(node.children, visit, node);
  }
}

export function findNode(nodes: PageNode[], id: string): PageNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function findParent(nodes: PageNode[], id: string, parent: PageNode | null = null): PageNode | null {
  for (const node of nodes) {
    if (node.id === id) return parent;
    if (node.children) {
      const found = findParent(node.children, id, node);
      if (found !== null || node.children.some((c) => c.id === id)) return found;
    }
  }
  return null;
}

export function removeNode(nodes: PageNode[], id: string): { tree: PageNode[]; removed: PageNode | null } {
  let removed: PageNode | null = null;
  const tree = nodes
    .filter((node) => {
      if (node.id === id) {
        removed = node;
        return false;
      }
      return true;
    })
    .map((node) =>
      node.children ? { ...node, children: removeNode(node.children, id).tree } : node,
    );
  return { tree, removed };
}

export function insertNodeAt(
  nodes: PageNode[],
  parentId: string | null,
  index: number,
  node: PageNode,
): PageNode[] {
  if (parentId === null) {
    const next = [...nodes];
    next.splice(Math.max(0, Math.min(index, next.length)), 0, node);
    return next;
  }
  return nodes.map((n) => {
    if (n.id === parentId) {
      const children = [...(n.children ?? [])];
      children.splice(Math.max(0, Math.min(index, children.length)), 0, node);
      return { ...n, children };
    }
    if (n.children) return { ...n, children: insertNodeAt(n.children, parentId, index, node) };
    return n;
  });
}

export function updateNode(nodes: PageNode[], id: string, patch: Partial<PageNode>): PageNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, ...patch };
    if (n.children) return { ...n, children: updateNode(n.children, id, patch) };
    return n;
  });
}

export function cloneNodeWithNewIds(node: PageNode): PageNode {
  return {
    ...node,
    id: createId(node.type.slice(0, 3)),
    props: structuredCloneSafe(node.props),
    style: structuredCloneSafe(node.style),
    children: node.children?.map(cloneNodeWithNewIds),
  };
}

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export function countNodes(nodes: PageNode[]): number {
  let count = 0;
  walkNodes(nodes, () => {
    count += 1;
  });
  return count;
}

/* ────────────────────────────────────────────────────────────
 *  Document construction / migration
 * ──────────────────────────────────────────────────────────── */

export function sectionNode(type: string, props: Record<string, unknown> = {}, children: PageNode[] = [], style: StyleProps = {}): PageNode {
  return { id: createId('sec'), type, props, style, children };
}

export function blankDocument(): PageDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    theme: DEFAULT_THEME,
    sections: [
      sectionNode(
        'section',
        { tag: 'section' },
        [
          {
            id: createId('h'),
            type: 'heading',
            props: { text: 'Your headline goes here', level: 1, align: 'center' },
            style: { fontSize: { base: 44, mobile: 30 }, maxWidth: { base: 720 } },
          },
          {
            id: createId('t'),
            type: 'text',
            props: {
              text: 'Describe your offer in a couple of sentences. Keep it short and concrete.',
              align: 'center',
              size: 'lg',
            },
            style: { maxWidth: { base: 620 } },
          },
          {
            id: createId('b'),
            type: 'button',
            props: { label: 'Get started', href: '#', variant: 'primary', align: 'center' },
            style: {},
          },
        ],
        { padding: { base: [96, 24, 96, 24], mobile: [56, 20, 56, 20] }, background: { base: '#F8FAFC' } },
      ),
    ],
  };
}

/** Best-effort upgrade of stored documents to the current schema version. */
export function migrateDocument(input: unknown): PageDocument {
  const raw = (input ?? {}) as Partial<PageDocument>;
  const theme: Theme = {
    ...DEFAULT_THEME,
    ...(raw.theme ?? {}),
    colors: { ...DEFAULT_THEME.colors, ...(raw.theme?.colors ?? {}) },
    fonts: { ...DEFAULT_THEME.fonts, ...(raw.theme?.fonts ?? {}) },
  };
  // Invalid shapes are passed through untouched so zod reports a proper 400
  // instead of the migration throwing an unexpected TypeError.
  const sections =
    raw.sections === undefined
      ? []
      : Array.isArray(raw.sections)
        ? (raw.sections as PageNode[]).map(normalizeNode)
        : (raw.sections as unknown as PageNode[]);
  return { schemaVersion: SCHEMA_VERSION, theme, sections };
}

function normalizeNode(node: PageNode): PageNode {
  return {
    id: node.id || createId(node.type?.slice(0, 3) ?? 'n'),
    type: node.type || 'container',
    props: node.props && typeof node.props === 'object' ? node.props : {},
    style: node.style && typeof node.style === 'object' ? node.style : {},
    children: Array.isArray(node.children) ? node.children.map(normalizeNode) : undefined,
  };
}

export function parseDocument(input: unknown): PageDocument {
  const raw = (input ?? {}) as { schemaVersion?: unknown; sections?: unknown };

  if (typeof raw.schemaVersion === 'number' && raw.schemaVersion > SCHEMA_VERSION) {
    throw new ZodError([
      { code: z.ZodIssueCode.custom, path: ['schemaVersion'], message: `Unsupported schema version ${raw.schemaVersion}; expected ${SCHEMA_VERSION}` },
    ]);
  }

  if (raw.sections !== undefined && !Array.isArray(raw.sections)) {
    throw new ZodError([{ code: z.ZodIssueCode.custom, path: ['sections'], message: 'sections must be an array' }]);
  }

  const MAX_DEPTH = 60;
  const MAX_NODES = 5000;
  let count = 0;

  const checkNodes = (nodes: unknown[], depth: number, path: (string | number)[]): void => {
    if (depth > MAX_DEPTH) {
      throw new ZodError([{ code: z.ZodIssueCode.custom, path, message: `Max nesting depth is ${MAX_DEPTH}` }]);
    }
    nodes.forEach((node, index) => {
      count += 1;
      if (count > MAX_NODES) {
        throw new ZodError([{ code: z.ZodIssueCode.custom, path, message: `Max block count is ${MAX_NODES}` }]);
      }
      if (!node || typeof node !== 'object') {
        throw new ZodError([{ code: z.ZodIssueCode.custom, path: [...path, index], message: 'block must be an object' }]);
      }
      const record = node as Record<string, unknown>;
      if (typeof record.type !== 'string' || record.type.length === 0) {
        throw new ZodError([{ code: z.ZodIssueCode.custom, path: [...path, index, 'type'], message: 'block type is required' }]);
      }
      if (typeof record.id !== 'string' || record.id.length === 0) {
        throw new ZodError([{ code: z.ZodIssueCode.custom, path: [...path, index, 'id'], message: 'block id is required' }]);
      }
      if (record.children !== undefined) {
        if (!Array.isArray(record.children)) {
          throw new ZodError([{ code: z.ZodIssueCode.custom, path: [...path, index, 'children'], message: 'children must be an array' }]);
        }
        checkNodes(record.children, depth + 1, [...path, index, 'children']);
      }
    });
  };

  if (Array.isArray(raw.sections)) {
    raw.sections.forEach((node, index) => {
      const type = node && typeof node === 'object' ? (node as Record<string, unknown>).type : undefined;
      if (type !== 'section') {
        throw new ZodError([
          { code: z.ZodIssueCode.custom, path: ['sections', index, 'type'], message: 'top-level blocks must be of type "section"' },
        ]);
      }
    });
    checkNodes(raw.sections, 0, ['sections']);
  }

  return pageDocumentSchema.parse(migrateDocument(input));
}

/**
 * Replaces nodes whose type is not in the registry with a placeholder text block,
 * so an unknown/removed block can never break rendering or publishing.
 */
export function pruneUnknownBlocks(doc: PageDocument, knownTypes: ReadonlySet<string>): PageDocument {
  const prune = (nodes: PageNode[]): PageNode[] =>
    nodes.map((node) => {
      const nextChildren = node.children ? prune(node.children) : undefined;
      if (!knownTypes.has(node.type)) {
        return {
          id: node.id,
          type: 'text',
          props: { text: '[unknown block]', align: 'left', size: 'md' },
          style: {},
        };
      }
      return nextChildren ? { ...node, children: nextChildren } : node;
    });
  return { ...doc, sections: prune(doc.sections) };
}
