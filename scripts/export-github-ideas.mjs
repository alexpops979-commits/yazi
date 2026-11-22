/**
 * Exports the GitHub project ideas JSON as a Markdown catalog.
 * Usage: node scripts/export-github-ideas.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('apps/web/src/data/github-ideas.json');
const OUT = path.resolve('docs/GITHUB_IDEAS.md');

const ideas = JSON.parse(readFileSync(SRC, 'utf8'));

const CATEGORY_LABELS = {
  web: 'Web-приложения',
  devtools: 'Инструменты разработчика',
  ai: 'AI / ML',
  data: 'Данные и аналитика',
  mobile: 'Мобильные приложения',
  games: 'Игры',
  infra: 'Инфраструктура и DevOps',
  education: 'Обучение',
  productivity: 'Продуктивность',
  oss: 'Open-source утилиты',
};

const byCategory = new Map();
for (const idea of ideas) {
  if (!byCategory.has(idea.category)) byCategory.set(idea.category, []);
  byCategory.get(idea.category).push(idea);
}

const languages = [...new Set(ideas.flatMap((idea) => idea.languages))].sort();
const fullstack = ideas.filter((idea) => idea.backend && idea.frontend).length;
const backendOnly = ideas.filter((idea) => idea.backend && !idea.frontend).length;
const frontendOnly = ideas.filter((idea) => !idea.backend && idea.frontend).length;
const toolOnly = ideas.filter((idea) => !idea.backend && !idea.frontend).length;
const average = (ideas.reduce((sum, idea) => sum + idea.difficulty, 0) / ideas.length).toFixed(1);

const lines = [
  '# Идеи проектов для GitHub',
  '',
  `Каталог из **${ideas.length}** идей для портфолио. У каждой указана сложность (1–10) и требуемые навыки.`,
  '',
  '## Как пользоваться',
  '',
  '- **1–3** — учебный проект на выходные, один экран и понятная механика.',
  '- **4–6** — портфолио-уровень: база, авторизация, несколько сценариев, деплой.',
  '- **7–10** — сложный продукт: интеграции, производительность, безопасность, командная работа.',
  '',
  '| Метрика | Значение |',
  '|---|---|',
  `| Всего идей | ${ideas.length} |`,
  `| Средняя сложность | ${average} / 10 |`,
  `| Fullstack (backend + frontend) | ${fullstack} |`,
  `| Только backend | ${backendOnly} |`,
  `| Только frontend | ${frontendOnly} |`,
  `| CLI / инструменты | ${toolOnly} |`,
  `| Языки | ${languages.join(', ')} |`,
  '',
  'Актуальная версия с фильтрами — в приложении: **/ideas → «Для GitHub»**.',
  '',
];

for (const [category, items] of byCategory) {
  lines.push(`## ${CATEGORY_LABELS[category] ?? category}`, '');
  lines.push('| Идея | Сложность | Навыки | Языки | Описание |');
  lines.push('|---|---|---|---|---|');
  for (const idea of items.sort((a, b) => a.difficulty - b.difficulty)) {
    const skills = idea.backend && idea.frontend ? 'Fullstack' : idea.backend ? 'Backend' : idea.frontend ? 'Frontend' : 'CLI / Tool';
    lines.push(`| ${idea.title} | ${idea.difficulty}/10 | ${skills} | ${idea.languages.join(', ')} | ${idea.summary} |`);
  }
  lines.push('');
}

lines.push(
  '---',
  '',
  'Каталог сгенерирован из `apps/web/src/data/github-ideas.json`.',
  'Измените JSON и выполните `npm run ideas:export`, чтобы обновить этот файл.',
  '',
);

writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`✓ ${OUT}: ${ideas.length} идей, ${byCategory.size} категорий`);
