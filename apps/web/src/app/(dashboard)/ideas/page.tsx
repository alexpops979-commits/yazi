'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Github, Lightbulb, Sparkles } from 'lucide-react';
import type { ProjectSummary, TemplateSummary } from '@dalmg/contracts';
import { Alert, Badge, Button, Card, Input, Spinner, cn } from '@/components/ui';
import { useApi } from '@/lib/auth';
import { errorMessage, useAsync } from '@/lib/hooks';
import { IDEAS } from '@/lib/ideas';
import githubIdeasJson from '@/data/github-ideas.json';

type GithubIdea = {
  title: string;
  category: string;
  difficulty: number;
  backend: boolean;
  frontend: boolean;
  languages: string[];
  summary: string;
};

const GITHUB_IDEAS = githubIdeasJson as GithubIdea[];

const SITE_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'restaurant', label: 'Еда' },
  { value: 'shop', label: 'Магазины' },
  { value: 'other', label: 'Услуги' },
  { value: 'consulting', label: 'Консалтинг' },
  { value: 'agency', label: 'Агентства' },
  { value: 'personal', label: 'Специалисты' },
  { value: 'saas', label: 'SaaS' },
];

const GH_CATEGORIES = [
  { value: 'all', label: 'Все' },
  { value: 'web', label: 'Web' },
  { value: 'devtools', label: 'DevTools' },
  { value: 'ai', label: 'AI/ML' },
  { value: 'data', label: 'Данные' },
  { value: 'mobile', label: 'Мобильные' },
  { value: 'games', label: 'Игры' },
  { value: 'infra', label: 'Инфра' },
  { value: 'education', label: 'Обучение' },
  { value: 'productivity', label: 'Продуктивность' },
  { value: 'oss', label: 'Утилиты' },
];

const LANGUAGES = [...new Set(GITHUB_IDEAS.flatMap((idea) => idea.languages))].sort();
const PAGE_SIZE = 60;

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '1–3 · новичок' },
  { value: 'mid', label: '4–6 · средний' },
  { value: 'hard', label: '7–10 · продвинутый' },
];

const ROLE_OPTIONS = [
  { value: 'backend', label: 'Backend' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'fullstack', label: 'Fullstack' },
  { value: 'tool', label: 'CLI / Tool' },
];

function difficultyTone(value: number): 'green' | 'amber' | 'red' | 'purple' {
  if (value <= 3) return 'green';
  if (value <= 6) return 'amber';
  if (value <= 8) return 'red';
  return 'purple';
}

export default function IdeasPage() {
  const api = useApi();
  const router = useRouter();
  const templates = useAsync(() => api<TemplateSummary[]>('/templates'), []);

  const [tab, setTab] = useState<'sites' | 'github'>('sites');

  const [siteFilter, setSiteFilter] = useState('all');
  const [siteQuery, setSiteQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ghCategory, setGhCategory] = useState('all');
  const [ghLanguages, setGhLanguages] = useState<string[]>([]);
  const [ghMatchAll, setGhMatchAll] = useState(false);
  const [ghDifficulty, setGhDifficulty] = useState<'all' | 'easy' | 'mid' | 'hard'>('all');
  const [ghRole, setGhRole] = useState<'all' | 'backend' | 'frontend' | 'fullstack' | 'tool'>('all');
  const [ghQuery, setGhQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [ghCategory, ghLanguages, ghMatchAll, ghDifficulty, ghRole, ghQuery]);

  const bySlug = useMemo(() => new Map((templates.data ?? []).map((template) => [template.slug, template])), [templates.data]);

  const siteIdeas = useMemo(
    () =>
      IDEAS.filter((idea) => {
        const matchesFilter = siteFilter === 'all' || idea.category === siteFilter;
        const matchesQuery = !siteQuery || `${idea.title} ${idea.description}`.toLowerCase().includes(siteQuery.toLowerCase());
        return matchesFilter && matchesQuery;
      }),
    [siteFilter, siteQuery],
  );

  const githubIdeas = useMemo(
    () =>
      GITHUB_IDEAS.filter((idea) => {
        if (ghCategory !== 'all' && idea.category !== ghCategory) return false;
        if (ghLanguages.length > 0) {
          const matched =
            ghMatchAll && ghLanguages.length > 1
              ? ghLanguages.every((language) => idea.languages.includes(language))
              : ghLanguages.some((language) => idea.languages.includes(language));
          if (!matched) return false;
        }
        if (ghDifficulty === 'easy' && idea.difficulty > 3) return false;
        if (ghDifficulty === 'mid' && (idea.difficulty < 4 || idea.difficulty > 6)) return false;
        if (ghDifficulty === 'hard' && idea.difficulty < 7) return false;
        const fullstack = idea.backend && idea.frontend;
        if (ghRole === 'backend' && !idea.backend) return false;
        if (ghRole === 'frontend' && !idea.frontend) return false;
        if (ghRole === 'fullstack' && !fullstack) return false;
        if (ghRole === 'tool' && (idea.backend || idea.frontend)) return false;
        if (ghQuery && !`${idea.title} ${idea.summary}`.toLowerCase().includes(ghQuery.toLowerCase())) return false;
        return true;
      }),
    [ghCategory, ghLanguages, ghMatchAll, ghDifficulty, ghRole, ghQuery],
  );

  async function createSite(idea: (typeof IDEAS)[number]) {
    const template = bySlug.get(idea.slug);
    if (!template) return;
    setBusy(idea.title);
    setError(null);
    try {
      const project = await api<ProjectSummary>('/projects', { method: 'POST', body: { name: idea.title, templateId: template.id } });
      router.push(`/projects/${project.id}`);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Lightbulb size={18} className="text-amber-500" />
          <h1 className="text-2xl font-semibold tracking-tight">Идеи проектов</h1>
        </div>
        <div className="ml-auto inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setTab('sites')}
            className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition', tab === 'sites' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500')}
          >
            Для конструктора
          </button>
          <button
            onClick={() => setTab('github')}
            className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition', tab === 'github' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500')}
          >
            <Github size={13} /> Для GitHub
          </button>
        </div>
      </div>

      {error && <div className="mt-4"><Alert>{error}</Alert></div>}

      {tab === 'sites' ? (
        <>
          <p className="mt-1 text-sm text-slate-500">50 готовых ниш — выберите идею, и мы создадим сайт из подходящего шаблона.</p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {SITE_FILTERS.map((item) => (
              <button
                key={item.value}
                onClick={() => setSiteFilter(item.value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                  siteFilter === item.value
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
                )}
              >
                {item.label}
              </button>
            ))}
            <div className="ml-auto w-56">
              <Input value={siteQuery} onChange={(event) => setSiteQuery(event.target.value)} placeholder="Поиск идеи…" className="h-8 text-xs" />
            </div>
          </div>

          <div className="mt-6">
            {templates.loading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {siteIdeas.map((idea) => {
                  const template = bySlug.get(idea.slug);
                  return (
                    <Card key={idea.title} className="flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{idea.title}</p>
                        <Badge tone="purple">{idea.category}</Badge>
                      </div>
                      <p className="mt-1 flex-1 text-xs text-slate-500">{idea.description}</p>
                      <p className="mt-2 truncate text-[11px] text-slate-400">Шаблон: {template?.name ?? idea.slug}</p>
                      <Button size="sm" className="mt-3" loading={busy === idea.title} disabled={!template} onClick={() => createSite(idea)}>
                        <Sparkles size={13} /> Создать сайт
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-500">
            {GITHUB_IDEAS.length} идей для портфолио: сложность 1–10, навыки и языки. Языки можно комбинировать —
            например backend на Python, а frontend на TypeScript.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {GH_CATEGORIES.map((item) => (
              <button
                key={item.value}
                onClick={() => setGhCategory(item.value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                  ghCategory === item.value
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Dropdown
              placeholder="Любой язык"
              options={LANGUAGES.map((language) => ({ value: language, label: language }))}
              selected={ghLanguages}
              onChange={setGhLanguages}
              multiple
              footer={
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={ghMatchAll}
                    disabled={ghLanguages.length < 2}
                    onChange={(event) => setGhMatchAll(event.target.checked)}
                    className="h-3.5 w-3.5 accent-brand-600"
                  />
                  Только идеи, где языки сочетаются
                </label>
              }
            />
            <Dropdown
              placeholder="Любая сложность"
              options={DIFFICULTY_OPTIONS}
              selected={ghDifficulty === 'all' ? [] : [ghDifficulty]}
              onChange={(values) => setGhDifficulty((values[0] ?? 'all') as typeof ghDifficulty)}
            />
            <Dropdown
              placeholder="Любая роль"
              options={ROLE_OPTIONS}
              selected={ghRole === 'all' ? [] : [ghRole]}
              onChange={(values) => setGhRole((values[0] ?? 'all') as typeof ghRole)}
            />
            <Input value={ghQuery} onChange={(event) => setGhQuery(event.target.value)} placeholder="Поиск по идеям…" className="h-9 text-xs" />
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              {ghLanguages.length > 1
                ? ghMatchAll
                  ? `Показаны идеи, где сочетаются: ${ghLanguages.join(' + ')}`
                  : `Показаны идеи с любым из: ${ghLanguages.join(', ')}`
                : 'Выберите несколько языков, чтобы увидеть комбинированные стеки.'}
            </span>
            <div className="flex items-center gap-3">
              {(ghLanguages.length > 0 || ghDifficulty !== 'all' || ghRole !== 'all' || ghQuery.length > 0 || ghCategory !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setGhLanguages([]);
                    setGhMatchAll(false);
                    setGhDifficulty('all');
                    setGhRole('all');
                    setGhQuery('');
                    setGhCategory('all');
                  }}
                  className="text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-300"
                >
                  Сбросить фильтры
                </button>
              )}
              <span className="text-xs text-slate-500">Показано {githubIdeas.length} из {GITHUB_IDEAS.length}</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {githubIdeas.slice(0, visible).map((idea) => {
              const fullstack = idea.backend && idea.frontend;
              return (
                <Card key={idea.title} className="flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{idea.title}</p>
                    <Badge tone={difficultyTone(idea.difficulty)}>{idea.difficulty}/10</Badge>
                  </div>
                  <p className="mt-1 flex-1 text-xs text-slate-500">{idea.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {idea.languages.map((language) => (
                      <Badge key={language} tone="blue">{language}</Badge>
                    ))}
                    {fullstack ? (
                      <Badge tone="purple">Fullstack</Badge>
                    ) : idea.backend ? (
                      <Badge tone="green">Backend</Badge>
                    ) : idea.frontend ? (
                      <Badge tone="amber">Frontend</Badge>
                    ) : (
                      <Badge tone="blue">CLI / Tool</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">{idea.category}</p>
                </Card>
              );
            })}
          </div>
          {!githubIdeas.length && <p className="mt-8 text-center text-sm text-slate-500">Ничего не найдено — ослабьте фильтры.</p>}

          {visible < githubIdeas.length && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
                Показать ещё {Math.min(PAGE_SIZE, githubIdeas.length - visible)}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type DropdownOption = { value: string; label: string };

function Dropdown({
  placeholder,
  options,
  selected,
  onChange,
  multiple = false,
  footer,
}: {
  placeholder: string;
  options: DropdownOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  multiple?: boolean;
  footer?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const labels = options.filter((option) => selected.includes(option.value)).map((option) => option.label);
  const text = labels.length ? labels.join(', ') : placeholder;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-xs text-slate-700 transition hover:border-slate-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600"
      >
        <span className={cn('truncate', !labels.length && 'text-slate-400')}>{text}</span>
        <ChevronDown size={14} className={cn('shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-40 mt-1 min-w-[220px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-float dark:border-slate-700 dark:bg-slate-900">
          <div className="max-h-56 overflow-y-auto p-1">
            {options.map((option) => {
              const active = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (multiple) {
                      onChange(active ? selected.filter((value) => value !== option.value) : [...selected, option.value]);
                    } else {
                      onChange([option.value]);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition',
                    active
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  <span className="flex h-3.5 w-3.5 items-center justify-center">
                    {active && <Check size={12} />}
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>

          {footer && <div className="border-t border-slate-100 p-1 dark:border-slate-800">{footer}</div>}

          {multiple && selected.length > 0 && (
            <div className="border-t border-slate-100 p-1 dark:border-slate-800">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded-lg px-2.5 py-1.5 text-left text-[11px] text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Сбросить выбор
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
