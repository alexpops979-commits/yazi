'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LayoutTemplate } from 'lucide-react';
import type { ProjectSummary, TemplateSummary } from '@dalmg/contracts';
import { Alert, Badge, Button, Card, Field, Input, Modal, Spinner, cn } from '@/components/ui';
import { useApi } from '@/lib/auth';
import { errorMessage, slugifyClient, useAsync } from '@/lib/hooks';

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'restaurant', label: 'Рестораны' },
  { value: 'consulting', label: 'Консалтинг' },
  { value: 'agency', label: 'Агентства' },
  { value: 'shop', label: 'Магазины' },
  { value: 'personal', label: 'Специалисты' },
  { value: 'saas', label: 'SaaS' },
];

export default function TemplatesPage() {
  const api = useApi();
  const router = useRouter();
  const templates = useAsync(() => api<TemplateSummary[]>('/templates'), []);
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<TemplateSummary | null>(null);

  const filtered = useMemo(
    () => (templates.data ?? []).filter((template) => category === 'all' || template.category === category),
    [templates.data, category],
  );

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Шаблоны</h1>
      <p className="mt-1 text-sm text-slate-500">Готовые структуры под нишу: замените текст и изображения.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {CATEGORIES.map((item) => (
          <button
            key={item.value}
            onClick={() => setCategory(item.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition',
              category === item.value ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {templates.error && <div className="mt-6"><Alert>{templates.error}</Alert></div>}

      <div className="mt-6">
        {templates.loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-6 w-6" /></div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((template) => (
              <Card key={template.id} className="group overflow-hidden p-0">
                <div className="relative h-40 overflow-hidden bg-slate-100">
                  {template.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={template.thumbnailUrl} alt={template.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400"><LayoutTemplate size={28} /></div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600 backdrop-blur">
                    {template.category}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold">{template.name}</p>
                  <p className="mt-1 line-clamp-2 min-h-[32px] text-xs text-slate-500">{template.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    {template.isSystem ? <Badge tone="purple">системный</Badge> : <span />}
                    <Button size="sm" variant="secondary" onClick={() => setSelected(template)}>
                      Использовать <ArrowRight size={13} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateFromTemplateModal
        template={selected}
        onClose={() => setSelected(null)}
        onCreate={async (payload) => {
          const project = await api<ProjectSummary>('/projects', { method: 'POST', body: payload });
          setSelected(null);
          router.push(`/projects/${project.id}`);
        }}
      />
    </div>
  );
}

function CreateFromTemplateModal({
  template,
  onClose,
  onCreate,
}: {
  template: TemplateSummary | null;
  onClose: () => void;
  onCreate: (payload: { name: string; subdomain: string; templateId: string }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!template) return null;

  return (
    <Modal
      open={!!template}
      onClose={onClose}
      title={`Новый сайт из «${template.name}»`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button
            loading={loading}
            disabled={name.trim().length < 2}
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                await onCreate({ name: name.trim(), subdomain: (subdomain || slugifyClient(name)).trim(), templateId: template.id });
              } catch (caught) {
                setError(errorMessage(caught));
              } finally {
                setLoading(false);
              }
            }}
          >
            Создать сайт
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Название проекта">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={template.name} autoFocus />
        </Field>
        <Field label="Субдомен" hint={`${subdomain || slugifyClient(name) || 'site'}.${process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'lvh.me:3000'}`}>
          <Input value={subdomain} onChange={(event) => setSubdomain(slugifyClient(event.target.value))} placeholder={slugifyClient(template.name)} />
        </Field>
      </div>
    </Modal>
  );
}
