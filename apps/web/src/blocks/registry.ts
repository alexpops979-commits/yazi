import { DEFINITIONS } from './definitions';
import type { BlockCategory, BlockDefinition } from './types';

export const BLOCK_REGISTRY: Record<string, BlockDefinition> = Object.fromEntries(
  DEFINITIONS.map((definition) => [definition.type, definition]),
);

export const KNOWN_BLOCK_TYPES = new Set(Object.keys(BLOCK_REGISTRY));

export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return BLOCK_REGISTRY[type];
}

export const CATEGORY_LABELS: Record<BlockCategory, string> = {
  layout: 'Раскладка',
  basic: 'Базовые',
  media: 'Медиа',
  marketing: 'Маркетинг',
};

export const PALETTE: { category: BlockCategory; items: BlockDefinition[] }[] = (
  ['layout', 'basic', 'media', 'marketing'] as BlockCategory[]
).map((category) => ({
  category,
  items: DEFINITIONS.filter((definition) => definition.category === category),
}));
