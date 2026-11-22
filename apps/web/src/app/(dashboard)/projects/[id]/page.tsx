'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  LayoutTemplate,
  Pencil,
  Plus,
  Rocket,
  Settings,
  Trash2,
} from 'lucide-react';
import type { PageSummary, ProjectSummary, TemplateSummary } from '@yazi/contracts';
import { Alert, Badge, Button, Card, Field, Input, Modal, Select, Spinner } from '@/components/ui';
import { useApi } from '@/lib/auth';
import { errorMessage, timeAgo, useAsync } from '@/lib/hooks';

type ProjectStats = {
  totalPublishes: number;
  totalViews: number;
  publishesByDay: { date: string; count: number }[];
  pages: { id: string; title: string; path: string; status: string; views: number; updatedAt: string }[];
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const api = useApi();
  const router = useRouter();

  const project = useAsync(() => api<ProjectSummary>(`/projects/${projectId}`), [projectId]);
  const pages = useAsync(() => api<PageSummary[]>(`/projects/${projectId}/pages`), [projectId]);
  const stats = useAsync(() => api<ProjectStats>(`/projects/${projectId}/stats`), [projectId]);
  const templates = useAsync(() => api<TemplateSummary[]>('/templates'), []);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = async () => {
    await Promise.all([project.reload(), pages.reload(), stats.reload()]);
  };

  async function publishAll() {
    setBusy('all');
    setError(null);
    try {
      await api(`/projects/${projectId}/publish`, { method: 'POST' });
      await reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function publishPage(pageId: string) {
    setBusy(pageId);
    setError(null);
    try {
      await api(`/pages/${pageId}/publish`, { method: 'POST', body: {} });
      await reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function duplicatePage(pageId: string) {
    setBusy(pageId);
    try {
      await api(`/pages/${pageId}/duplicate`, { method: 'POST', body: {} });
      await reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function deletePage(pageId: string, title: string) {
    if (!window.confirm(`Удалить страницу «${title}»?`)) return;
    setBusy(pageId);
    try {
      await api(`/pages/${pageId}`, { method: 'DELETE' });
      await reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  if (project.loading) return <div className="flex justify-center py-24"><Spinner className="h-6 w-6" /></div>;
  if (!project.data) return <div className="p-8"><Alert>{project.error ?? 'Проект не найден'}</Alert></div>;

  const home = pages.data?.find((page) => page.path === '/') ?? pages.data?.[0];

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <Link href="/projects" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={13} /> Все проекты
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.data.name}</h1>
            {project.data.status === 'PUBLISHED' ? <Badge tone="green">Опубликован</Badge> : <Badge tone="amber">Черновик</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <a href={project.data.siteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-brand-600">
              {project.data.domains.find((domain) => domain.primary)?.host ?? project.data.subdomain}
              <ExternalLink size={12} />
            </a>
            <span>·</span>
            <span>{project.data.pageCount} страниц</span>
            <span>·</span>
            <span>обновлён {timeAgo(project.data.updatedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {home && (
            <Link href={`/editor/${projectId}/${home.id}`}>
              <Button variant="secondary"><Pencil size={15} /> Редактор</Button>
            </Link>
          )}
          <Link href={`/projects/${projectId}/settings`}>
            <Button variant="secondary"><Settings size={15} /> Настройки</Button>
          </Link>
          <Button onClick={publishAll} loading={busy === 'all'}><Rocket size={15} /> Опубликовать всё</Button>
        </div>
      </div>

      {error && <div className="mt-4"><Alert>{error}</Alert></div>}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold">Страницы</h2>
            <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}><Plus size={14} /> Добавить</Button>
          </div>
          <div className="divide-y divide-slate-100">
            {pages.data?.map((page) => (
              <div key={page.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500">
                  <FileText size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{page.title}</p>
                    {page.status === 'PUBLISHED' ? <Badge tone="green">live</Badge> : <Badge>draft</Badge>}
                    {page.status === 'PUBLISHED' && page.publishedRevision !== page.revision && (
                      <Badge tone="amber">изменения</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    <span className="font-mono">{page.path}</span> · обновлена {timeAgo(page.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/editor/${projectId}/${page.id}`}>
                    <Button size="sm" variant="ghost" title="Редактировать"><Pencil size={14} /></Button>
                  </Link>
                  <Button size="sm" variant="ghost" title="Дублировать" onClick={() => duplicatePage(page.id)} disabled={busy === page.id}>
                    <Copy size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" title="Опубликовать" onClick={() => publishPage(page.id)} disabled={busy === page.id}>
                    <Rocket size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" title="Удалить" onClick={() => deletePage(page.id, page.title)} disabled={busy === page.id}>
                    <Trash2 size={14} className="text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            {!pages.data?.length && !pages.loading && (
              <div className="px-5 py-8 text-center text-sm text-slate-500">Пока нет страниц</div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-sm font-semibold">Статистика</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Просмотры</p>
                <p className="mt-1 text-xl font-semibold">{stats.data?.totalViews ?? 0}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Публикации</p>
                <p className="mt-1 text-xl font-semibold">{stats.data?.totalPublishes ?? 0}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500">Публикации за 30 дней</p>
              <div className="mt-2 flex h-16 items-end gap-[3px]">
                {(stats.data?.publishesByDay ?? []).map((day) => {
                  const max = Math.max(1, ...(stats.data?.publishesByDay ?? []).map((item) => item.count));
                  return (
                    <div
                      key={day.date}
                      title={`${day.date}: ${day.count}`}
                      className="flex-1 rounded-sm bg-brand-500/70"
                      style={{ height: `${Math.max(4, (day.count / max) * 100)}%` }}
                    />
                  );
                })}
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Домены</h2>
              <Link href={`/projects/${projectId}/settings#domains`} className="text-xs font-medium text-brand-600 hover:underline">
                Управлять
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {project.data.domains.map((domain) => (
                <div key={domain.host} className="flex items-center gap-2 text-sm">
                  <Globe size={14} className="text-slate-400" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{domain.host}</span>
                  {domain.verified ? <Badge tone="green">ok</Badge> : <Badge tone="amber">pending</Badge>}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold">Быстрые действия</h2>
            <div className="mt-3 space-y-2">
              <Link href="/templates" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                <LayoutTemplate size={15} className="text-slate-400" /> Создать из шаблона
              </Link>
              <a href={project.data.siteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                <Eye size={15} className="text-slate-400" /> Открыть сайт
              </a>
            </div>
          </Card>
        </div>
      </div>

      <AddPageDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        templates={templates.data ?? []}
        pages={pages.data ?? []}
        onCreate={async (payload) => {
          const created = await api<PageSummary>(`/projects/${projectId}/pages`, { method: 'POST', body: payload });
          setAddOpen(false);
          router.push(`/editor/${projectId}/${created.id}`);
        }}
      />
    </div>
  );
}

function AddPageDialog({
  open,
  onClose,
  templates,
  pages,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  templates: TemplateSummary[];
  pages: PageSummary[];
  onCreate: (payload: { title: string; path: string; templateId?: string; fromPageId?: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [path, setPath] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [fromPageId, setFromPageId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новая страница"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button
            loading={loading}
            disabled={!title.trim() || !path.trim()}
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                await onCreate({ title, path, templateId: templateId || undefined, fromPageId: fromPageId || undefined });
              } catch (caught) {
                setError(errorMessage(caught));
              } finally {
                setLoading(false);
              }
            }}
          >
            Создать
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Название">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="О нас" autoFocus />
        </Field>
        <Field label="Путь" hint="Например /about">
          <Input value={path} onChange={(event) => setPath(event.target.value.startsWith('/') ? event.target.value : `/${event.target.value}`)} placeholder="/about" />
        </Field>
        <Field label="Шаблон">
          <Select value={templateId} onChange={(event) => { setTemplateId(event.target.value); if (event.target.value) setFromPageId(''); }}>
            <option value="">Пустая страница</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Или скопировать существующую">
          <Select value={fromPageId} onChange={(event) => { setFromPageId(event.target.value); if (event.target.value) setTemplateId(''); }}>
            <option value="">Не копировать</option>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>{page.title} ({page.path})</option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
