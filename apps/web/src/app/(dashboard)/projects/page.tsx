'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, ExternalLink, Plus, Settings, Sparkles } from 'lucide-react';
import type { ProjectSummary, TemplateSummary } from '@yazi/contracts';
import type { Theme } from '@yazi/page-schema';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Spinner } from '@/components/ui';
import { useApi } from '@/lib/auth';
import { errorMessage, slugifyClient, useAsync } from '@/lib/hooks';

export default function ProjectsPage() {
  const api = useApi();
  const router = useRouter();
  const projects = useAsync(() => api<ProjectSummary[]>('/projects'), []);
  const templates = useAsync(() => api<TemplateSummary[]>('/templates'), []);
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Проекты</h1>
          <p className="mt-1 text-sm text-slate-500">Создавайте сайты из шаблонов и публикуйте в один клик.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/templates">
            <Button variant="secondary">
              <Sparkles size={15} /> Шаблоны
            </Button>
          </Link>
          <Button onClick={() => setOpen(true)}>
            <Plus size={15} /> Новый проект
          </Button>
        </div>
      </div>

      {projects.error && <div className="mt-6"><Alert>{projects.error}</Alert></div>}

      <div className="mt-6">
        {projects.loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-6 w-6" /></div>
        ) : !projects.data?.length ? (
          <EmptyState
            title="Пока нет проектов"
            description="Начните с готового шаблона — это быстрее, чем пустая страница."
            action={<Button onClick={() => setOpen(true)}><Plus size={15} /> Создать проект</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.data.map((project) => (
              <ProjectCard key={project.id} project={project} onOpen={() => router.push(`/projects/${project.id}`)} />
            ))}
          </div>
        )}
      </div>

      <NewProjectDialog
        open={open}
        onClose={() => setOpen(false)}
        templates={templates.data ?? []}
        onCreate={async (payload) => {
          const project = await api<ProjectSummary>('/projects', { method: 'POST', body: payload });
          setOpen(false);
          router.push(`/projects/${project.id}`);
        }}
      />
    </div>
  );
}

function ProjectCard({ project, onOpen }: { project: ProjectSummary; onOpen: () => void }) {
  const theme = (project.theme ?? {}) as Partial<Theme>;
  const accent = theme.colors?.primary ?? '#3462F4';
  const background = theme.colors?.background ?? '#FFFFFF';

  return (
    <Card className="group flex flex-col overflow-hidden p-0 transition hover:shadow-panel">
      <button onClick={onOpen} className="relative block h-36 w-full overflow-hidden text-left" style={{ background }}>
        <div className="absolute inset-0 opacity-90" style={{ background: `radial-gradient(120% 120% at 0% 0%, ${accent}33 0%, transparent 60%)` }} />
        <div className="absolute inset-x-6 top-6 space-y-2">
          <div className="h-3 w-24 rounded-full" style={{ background: accent }} />
          <div className="h-2 w-40 rounded-full bg-slate-900/20" />
          <div className="h-2 w-32 rounded-full bg-slate-900/10" />
        </div>
        <div className="absolute inset-x-6 bottom-5 flex gap-2">
          <div className="h-6 w-16 rounded-md" style={{ background: accent }} />
          <div className="h-6 w-16 rounded-md border border-slate-900/10" />
        </div>
        <span className="absolute right-3 top-3 rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600 backdrop-blur">
          {project.pageCount} стр.
        </span>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>
            <a
              href={project.siteUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500 hover:text-brand-600"
            >
              {project.domains.find((domain) => domain.primary)?.host ?? project.subdomain}
              <ExternalLink size={11} />
            </a>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {project.status === 'PUBLISHED' ? <Badge tone="green">Опубликован</Badge> : <Badge tone="amber">Черновик</Badge>}
            {project.status === 'PUBLISHED' && project.hasUnpublishedChanges && <Badge tone="blue">Есть изменения</Badge>}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3">
          <Button size="sm" onClick={onOpen}>
            Открыть <ArrowUpRight size={13} />
          </Button>
          <Link href={`/projects/${project.id}/settings`} className="ml-auto">
            <Button size="sm" variant="ghost" title="Настройки">
              <Settings size={14} />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function NewProjectDialog({
  open,
  onClose,
  templates,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  templates: TemplateSummary[];
  onCreate: (payload: { name: string; subdomain?: string; templateId?: string }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [templateId, setTemplateId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const suggested = useMemo(() => slugifyClient(name), [name]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новый проект"
      description="Можно начать с шаблона или с пустой страницы."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button
            loading={loading}
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                await onCreate({ name: name.trim(), subdomain: (subdomain || suggested) || undefined, templateId: templateId || undefined });
                setName('');
                setSubdomain('');
                setTemplateId('');
              } catch (caught) {
                setError(errorMessage(caught));
              } finally {
                setLoading(false);
              }
            }}
            disabled={name.trim().length < 2}
          >
            Создать
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Название">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nordic Coffee" autoFocus />
        </Field>
        <Field label="Субдомен" hint={`Сайт будет доступен по адресу ${subdomain || suggested || 'site'}.${process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'lvh.me:3000'}`}>
          <Input
            value={subdomain}
            onChange={(event) => setSubdomain(slugifyClient(event.target.value))}
            placeholder={suggested || 'nordic-coffee'}
          />
        </Field>
        <Field label="Шаблон">
          <Select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            <option value="">Пустая страница</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {template.category}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
