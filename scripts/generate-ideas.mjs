/**
 * Regenerates the GitHub ideas catalog to exactly 1000 entries.
 * Curated ideas are preserved; previously generated "type × industry" entries
 * are replaced with a compatibility-checked batch.
 *
 * Usage: node scripts/generate-ideas.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('apps/web/src/data/github-ideas.json');
const TARGET = 1000;

const existing = JSON.parse(readFileSync(FILE, 'utf8'));

const DOMAINS = [
  ['стоматологии', 'расписание приёмов и карты пациентов'],
  ['автосервисов', 'заказ-наряды и склад запчастей'],
  ['фитнес-клубов', 'абонементы и расписание занятий'],
  ['юристов', 'дела, документы и биллинг часов'],
  ['ресторанов', 'меню, брони и смены'],
  ['отелей', 'номера, брони и гостевые запросы'],
  ['школ', 'классы, расписание и оценки'],
  ['частных клиник', 'приёмы и медицинские записи'],
  ['логистики', 'рейсы, склады и статусы'],
  ['недвижимости', 'объекты, показы и сделки'],
  ['фермеров', 'урожай, поставки и заказы'],
  ['строительных компаний', 'объекты, сметы и бригады'],
  ['барбершопов', 'запись, мастера и услуги'],
  ['фотографов', 'съёмки, галереи и заказы'],
  ['HR-команд', 'вакансии, кандидаты и интервью'],
  ['маркетинговых агентств', 'клиенты, кампании и отчёты'],
  ['финансовых команд', 'бюджеты, проводки и сверки'],
  ['SaaS-стартапов', 'подписки, тарифы и метрики'],
  ['музеев', 'экспонаты, экскурсии и билеты'],
  ['библиотек', 'фонд, выдачи и читатели'],
  ['НКО', 'доноры, программы и отчёты'],
  ['event-агентств', 'события, подрядчики и площадки'],
  ['зообизнеса', 'питомцы, услуги и записи'],
  ['кофеен', 'меню, смены и лояльность'],
  ['пекарен', 'заказы, ассортимент и доставка'],
  ['ритейла', 'товары, остатки и продажи'],
  ['производств', 'заказы, цеха и качество'],
  ['телекома', 'абоненты, тарифы и заявки'],
  ['госсектора', 'заявления, очереди и услуги'],
  ['спортивных клубов', 'секции, тренеры и расписание'],
];

const ARTIFACTS = [
  { category: 'web', name: 'CRM', base: 6, backend: true, frontend: true, languages: ['TypeScript', 'SQL'], features: 'клиенты, сделки, задачи и отчёты' },
  { category: 'web', name: 'Дашборд', base: 5, backend: true, frontend: true, languages: ['TypeScript', 'SQL'], features: 'метрики, графики, фильтры и экспорт' },
  { category: 'web', name: 'Маркетплейс', base: 7, backend: true, frontend: true, languages: ['TypeScript', 'SQL'], features: 'каталог, заказы, отзывы и выплаты' },
  { category: 'web', name: 'Портал самообслуживания', base: 6, backend: true, frontend: true, languages: ['TypeScript'], features: 'личный кабинет, заявки и документы' },
  { category: 'web', name: 'Система бронирования', base: 5, backend: true, frontend: true, languages: ['TypeScript', 'SQL'], features: 'слоты, оплата и напоминания' },
  { category: 'web', name: 'Платформа курсов', base: 7, backend: true, frontend: true, languages: ['TypeScript', 'SQL'], features: 'уроки, прогресс, тесты и сертификаты' },
  { category: 'web', name: 'Доска объявлений', base: 6, backend: true, frontend: true, languages: ['TypeScript', 'SQL'], features: 'категории, гео-поиск, фото и модерация' },
  { category: 'web', name: 'Helpdesk', base: 5, backend: true, frontend: true, languages: ['TypeScript', 'SQL'], features: 'тикеты, SLA, макросы и база знаний' },
  { category: 'web', name: 'Биллинг', base: 7, backend: true, frontend: true, languages: ['TypeScript', 'SQL'], features: 'тарифы, счета, платежи и возвраты' },
  { category: 'web', name: 'LMS', base: 7, backend: true, frontend: true, languages: ['TypeScript', 'SQL'], features: 'курсы, задания, проверки и аналитика', allow: ['школ', 'HR-команд', 'спортивных клубов', 'частных клиник', 'госсектора', 'библиотек'] },
  { category: 'web', name: 'Интернет-магазин', base: 6, backend: true, frontend: true, languages: ['TypeScript', 'SQL'], features: 'каталог, корзина, оплата и доставка' },
  { category: 'web', name: 'Аналитическая платформа', base: 6, backend: true, frontend: true, languages: ['TypeScript', 'SQL'], features: 'события, воронки, когорты и отчёты' },

  { category: 'ai', name: 'RAG-ассистент', base: 7, backend: true, frontend: true, languages: ['Python'], features: 'индексация, поиск, цитаты и оценка качества' },
  { category: 'ai', name: 'Суммаризатор', base: 5, backend: true, frontend: false, languages: ['Python'], features: 'дайджесты, темы и ключевые решения' },
  { category: 'ai', name: 'Классификатор заявок', base: 5, backend: true, frontend: false, languages: ['Python'], features: 'категории, приоритеты и маршрутизация' },
  { category: 'ai', name: 'Рекомендательная система', base: 7, backend: true, frontend: true, languages: ['Python', 'SQL'], features: 'персонализация, cold start и A/B' },
  { category: 'ai', name: 'OCR-пайплайн', base: 6, backend: true, frontend: false, languages: ['Python'], features: 'сканы, извлечение полей и валидация', allow: ['автосервисов', 'юристов', 'финансовых команд', 'госсектора', 'логистики', 'недвижимости', 'строительных компаний', 'производств', 'частных клиник'] },
  { category: 'ai', name: 'Чат-бот', base: 5, backend: true, frontend: true, languages: ['TypeScript', 'Python'], features: 'сценарии, интеграции и передача оператору' },

  { category: 'data', name: 'ETL-пайплайн', base: 6, backend: true, frontend: false, languages: ['Python', 'SQL'], features: 'источники, трансформации и расписание' },
  { category: 'data', name: 'Дашборд метрик', base: 5, backend: true, frontend: true, languages: ['TypeScript', 'SQL'], features: 'KPI, фильтры и экспорт' },
  { category: 'data', name: 'Каталог данных', base: 6, backend: true, frontend: true, languages: ['TypeScript', 'SQL'], features: 'таблицы, владельцы и lineage' },
  { category: 'data', name: 'Детектор аномалий', base: 7, backend: true, frontend: true, languages: ['Python'], features: 'сезонность, выбросы и алерты' },
  { category: 'data', name: 'Отчётность', base: 4, backend: true, frontend: true, languages: ['Python', 'SQL'], features: 'шаблоны, расписание и PDF' },

  { category: 'mobile', name: 'Мобильное приложение', base: 6, backend: true, frontend: true, languages: ['Kotlin'], features: 'каталог, заказы, push и офлайн' },
  { category: 'mobile', name: 'Мобильный трекер', base: 4, backend: false, frontend: true, languages: ['Swift'], features: 'записи, напоминания и статистика' },
  { category: 'mobile', name: 'Сканер', base: 4, backend: false, frontend: true, languages: ['Kotlin'], features: 'камера, распознавание и история', allow: ['ритейла', 'логистики', 'библиотек', 'производств', 'автосервисов', 'зообизнеса', 'пекарен', 'кофеен'] },
  { category: 'mobile', name: 'Офлайн-клиент', base: 5, backend: true, frontend: true, languages: ['Dart'], features: 'локальная БД, синхронизация и конфликты' },

  { category: 'education', name: 'Платформа обучения', base: 7, backend: true, frontend: true, languages: ['TypeScript', 'SQL'], features: 'курсы, задания и прогресс', allow: ['школ', 'HR-команд', 'спортивных клубов', 'библиотек', 'госсектора'] },
  { category: 'education', name: 'Тренажёр', base: 4, backend: false, frontend: true, languages: ['TypeScript'], features: 'упражнения, уровни и статистика', allow: ['школ', 'HR-команд', 'спортивных клубов', 'фитнес-клубов', 'языковых школ'] },
  { category: 'education', name: 'Генератор квизов', base: 4, backend: true, frontend: true, languages: ['TypeScript'], features: 'вопросы, варианты и результаты', allow: ['школ', 'HR-команд', 'спортивных клубов', 'библиотек', 'музеев'] },
  { category: 'education', name: 'Карточки повторения', base: 3, backend: false, frontend: true, languages: ['TypeScript'], features: 'колоды, интервалы и статистика', allow: ['школ', 'библиотек', 'HR-команд', 'спортивных клубов'] },

  { category: 'productivity', name: 'Трекер задач', base: 3, backend: false, frontend: true, languages: ['TypeScript'], features: 'записи, цели и графики' },
  { category: 'productivity', name: 'Менеджер задач', base: 4, backend: true, frontend: true, languages: ['TypeScript'], features: 'списки, теги и поиск' },
  { category: 'productivity', name: 'Заметки', base: 3, backend: false, frontend: true, languages: ['TypeScript'], features: 'markdown, теги и экспорт' },
  { category: 'productivity', name: 'Планировщик', base: 4, backend: true, frontend: true, languages: ['TypeScript'], features: 'слоты, напоминания и обзор недели' },
];

const generatedTitles = new Set();
for (const artifact of ARTIFACTS) {
  for (const [domain] of DOMAINS) generatedTitles.add(`${artifact.name} для ${domain}`.toLowerCase());
}

const DOMAIN_NAMES = new Set(DOMAINS.map(([domain]) => domain.toLowerCase()));
/** Generated entries always end with " для <industry>"; catches renamed artifact batches too. */
function isGeneratedTitle(title) {
  const match = title.toLowerCase().match(/^(.+) для (.+)$/);
  return !!match && DOMAIN_NAMES.has(match[2]);
}

// Keep curated entries only (drop every generated batch, including earlier names).
const curated = existing.filter((idea) => !isGeneratedTitle(idea.title));

const UI_LANGUAGES = new Set(['TypeScript', 'JavaScript', 'Dart', 'Kotlin', 'Swift', 'C#', 'Elixir', 'PHP', 'Ruby']);

// Frontend without a UI language is inconsistent: add TypeScript.
for (const idea of curated) {
  if (idea.frontend && !idea.languages.some((language) => UI_LANGUAGES.has(language))) {
    idea.languages = [...idea.languages, 'TypeScript'];
  }
}

const seen = new Set(curated.map((idea) => idea.title.toLowerCase()));
const buckets = new Map();

for (const artifact of ARTIFACTS) {
  const items = [];
  for (let index = 0; index < DOMAINS.length; index += 1) {
    const [domain, focus] = DOMAINS[index];
    if (artifact.allow && !artifact.allow.includes(domain)) continue;
    const title = `${artifact.name} для ${domain}`;
    if (seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());

    const bump = index % 4 === 0 ? 1 : 0;
    const languages = [...artifact.languages];
    if (artifact.frontend && !languages.some((language) => UI_LANGUAGES.has(language))) {
      languages.push('TypeScript');
    }

    items.push({
      title,
      category: artifact.category,
      difficulty: Math.max(2, Math.min(9, artifact.base + bump)),
      backend: artifact.backend,
      frontend: artifact.frontend,
      languages,
      summary: `${artifact.features}. Учтены отраслевые детали: ${focus}.`,
      generated: true,
    });
  }
  buckets.set(artifact.name, items);
}

// Round-robin across artifacts keeps category variety while filling to exactly 1000.
const needed = Math.max(0, TARGET - curated.length);
const generated = [];
let cursor = 0;
let guard = 0;
while (generated.length < needed && guard < 10000) {
  let progressed = false;
  for (const items of buckets.values()) {
    if (cursor < items.length && generated.length < needed) {
      generated.push(items[cursor]);
      progressed = true;
    }
  }
  cursor += 1;
  guard += 1;
  if (!progressed) break;
}

const merged = [...curated, ...generated];
writeFileSync(FILE, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

console.log(`curated: ${curated.length}, generated: ${generated.length}, total: ${merged.length}, target: ${TARGET}`);
if (merged.length !== TARGET) process.exitCode = 1;
