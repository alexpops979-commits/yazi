/**
 * One-off merge of the agent-generated batch (docs/ideas-extra.json) into the
 * main catalog, plus the consistency fixes found during review.
 *
 * Usage: node scripts/apply-ideas-extra.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const MAIN = path.resolve('apps/web/src/data/github-ideas.json');
const EXTRA = path.resolve(process.argv[2] ?? 'docs/ideas-extra.json');

const ideas = JSON.parse(readFileSync(MAIN, 'utf8'));
const extra = existsSync(EXTRA) ? JSON.parse(readFileSync(EXTRA, 'utf8')) : [];

/** Review fixes by original title. */
const RENAMES = {
  'Харнес оценки LLM': 'Харнесс оценки LLM',
  'Трекер привычек с друзьями': 'Социальные челленджи',
};

const PATCHES = {
  'Скаффолдер монорепо': { backend: false, frontend: false },
  'Социальные челленджи': { difficulty: 6 },
  'Агрегатор логов': { difficulty: 8 },
  'Менеджер паролей': { difficulty: 8 },
  'Синхронизация календарей': { difficulty: 6 },
  'Планировщик питания': { backend: true },
  'Idle-игра': { backend: false },
  'Текстовая RPG': { backend: false },
  'Менеджер сниппетов': { backend: false, frontend: true },
};

/** Direct duplicate of the mobile "Список чтения". */
const DROP = new Set(['Очередь чтения']);

const byTitle = new Map();
for (const idea of ideas) {
  if (DROP.has(idea.title)) continue;
  const title = RENAMES[idea.title] ?? idea.title;
  byTitle.set(title, { ...idea, title, ...(PATCHES[title] ?? {}) });
}

let added = 0;
for (const idea of extra) {
  const title = RENAMES[idea.title] ?? idea.title;
  if (byTitle.has(title)) continue;
  byTitle.set(title, { ...idea, title, ...(PATCHES[title] ?? {}) });
  added += 1;
}

const merged = [...byTitle.values()].sort((a, b) => a.category.localeCompare(b.category) || a.difficulty - b.difficulty || a.title.localeCompare(b.title));
writeFileSync(MAIN, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

console.log(`✓ merged: ${merged.length} ideas (added ${added}, removed ${ideas.length + extra.length - merged.length})`);
