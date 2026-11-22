'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Copy, Globe, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { DomainSummary, ProjectSummary } from '@dalmg/contracts';
import { Alert, Badge, Button, Card, Field, Input, Modal, Textarea } from '@/components/ui';
import { useApi } from '@/lib/auth';
import { errorMessage, useAsync } from '@/lib/hooks';

export default function ProjectSettingsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const api = useApi();
  const router = useRouter();

  const project = useAsync(() => api<ProjectSummary>(`/projects/${projectId}`), [projectId]);
  const domains = useAsync(() => api<DomainSummary[]>(`/projects/${projectId}/domains`), [projectId]);

  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [domainModal, setDomainModal] = useState(false);
  const [newDomain, setNewDomain] = useState<DomainSummary | null>(null);

  useEffect(() => {
    if (!project.data) return;
    setName(project.data.name);
    setSubdomain(project.data.subdomain);
    setSeoTitle(project.data.seo.title ?? '');
    setSeoDescription(project.data.seo.description ?? '');
    setFaviconUrl(project.data.faviconUrl ?? '');
    setCustomCode(project.data.customCode ?? '');
  }, [project.data]);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api(`/projects/${projectId}`, {
        method: 'PATCH',
        body: {
          name,
          subdomain,
          seo: { title: seoTitle, description: seoDescription },
          faviconUrl: faviconUrl || null,
          customCode,
        },
      });
      await project.reload();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function addDomain(host: string) {
    const domain = await api<DomainSummary>(`/projects/${projectId}/domains`, { method: 'POST', body: { host } });
    setNewDomain(domain);
    await domains.reload();
  }

  async function verifyDomain(id: string) {
    setError(null);
    try {
      const updated = await api<DomainSummary>(`/domains/${id}/verify`, { method: 'POST', body: {} });
      await domains.reload();
      if (updated.id === newDomain?.id) setNewDomain(updated);
      if (updated.status !== 'VERIFIED') setError('DNS-запись пока не найдена. Изменения могут применяться до 15 минут.');
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function removeDomain(id: string) {
    if (!window.confirm('Отключить домен?')) return;
    await api(`/domains/${id}`, { method: 'DELETE' }).catch((caught) => setError(errorMessage(caught)));
    await domains.reload();
  }

  async function destroyProject() {
    if (!window.confirm('Удалить проект со всеми страницами? Это необратимо.')) return;
    await api(`/projects/${projectId}`, { method: 'DELETE' }).catch((caught) => setError(errorMessage(caught)));
    router.push('/projects');
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={13} /> К проекту
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Настройки сайта</h1>
      <p className="mt-1 text-sm text-slate-500">Домен, SEO, иконка и дополнительный код.</p>

      {(error || project.error) && <div className="mt-4"><Alert>{error ?? project.error}</Alert></div>}
      {saved && <div className="mt-4"><Alert tone="green">Сохранено</Alert></div>}

      <Card className="mt-6 space-y-4">
        <h2 className="text-sm font-semibold">Основное</h2>
        <Field label="Название">
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Субдомен" hint={`Сейчас: ${project.data?.subdomain ?? ''}.${process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'lvh.me:3000'}`}>
          <Input value={subdomain} onChange={(event) => setSubdomain(event.target.value.toLowerCase())} />
        </Field>
        <Field label="Favicon URL" hint="Ссылка на .png или .svg">
          <Input value={faviconUrl} onChange={(event) => setFaviconUrl(event.target.value)} placeholder="https://…/favicon.png" />
        </Field>
      </Card>

      <Card className="mt-6 space-y-4">
        <h2 className="text-sm font-semibold">SEO по умолчанию</h2>
        <Field label="Title">
          <Input value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} maxLength={160} />
        </Field>
        <Field label="Description" hint={`${seoDescription.length}/320`}>
          <Textarea value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} maxLength={320} />
        </Field>
      </Card>

      <Card className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Дополнительный код</h2>
        </div>
        <p className="text-xs text-slate-500">Вставляется в конец &lt;body&gt; опубликованных страниц: аналитика, чаты, пиксели.</p>
        <Textarea
          value={customCode}
          onChange={(event) => setCustomCode(event.target.value)}
          className="font-mono text-xs"
          rows={6}
          placeholder="<script>…</script>"
        />
      </Card>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} loading={saving}>Сохранить изменения</Button>
      </div>

      <Card className="mt-8" >
        <div id="domains" className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Домены</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setDomainModal(true)}>
              <Plus size={14} /> Подключить домен
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {domains.data?.map((domain) => (
            <div key={domain.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Globe size={15} className="text-slate-400" />
                <span className="flex-1 truncate font-mono text-xs">{domain.host}</span>
                {domain.status === 'VERIFIED' ? <Badge tone="green">подтверждён</Badge> : domain.status === 'FAILED' ? <Badge tone="red">не найден</Badge> : <Badge tone="amber">ожидает</Badge>}
                {domain.isPrimary && <Badge tone="blue">основной</Badge>}
                <Button size="sm" variant="ghost" onClick={() => verifyDomain(domain.id)} title="Проверить DNS">
                  <RefreshCw size={13} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeDomain(domain.id)} title="Удалить">
                  <Trash2 size={13} className="text-red-500" />
                </Button>
              </div>
              {domain.status !== 'VERIFIED' && (
                <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 font-mono text-[11px] text-slate-600">
                  {domain.instructions.map((instruction) => (
                    <div key={`${instruction.type}-${instruction.name}`} className="flex flex-wrap gap-2">
                      <span className="w-14 shrink-0 font-semibold text-slate-500">{instruction.type}</span>
                      <span className="min-w-0 flex-1 truncate">{instruction.name}</span>
                      <span className="min-w-0 flex-1 truncate">{instruction.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!domains.data?.length && !domains.loading && (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              Свой домен пока не подключён. Сайт доступен на субдомене.
            </p>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Сайт: <a className="text-brand-600 hover:underline" href={project.data?.siteUrl} target="_blank" rel="noreferrer">{project.data?.siteUrl}</a>
        </p>
      </Card>

      <Card className="mt-6 border-red-100">
        <h2 className="text-sm font-semibold text-red-600">Удаление проекта</h2>
        <p className="mt-1 text-xs text-slate-500">Все страницы, версии и домены будут удалены безвозвратно.</p>
        <Button variant="danger" size="sm" className="mt-3" onClick={destroyProject}>
          <Trash2 size={14} /> Удалить проект
        </Button>
      </Card>

      <AddDomainModal
        open={domainModal}
        onClose={() => { setDomainModal(false); setNewDomain(null); }}
        domain={newDomain}
        onAdd={addDomain}
        onVerify={verifyDomain}
      />
    </div>
  );
}

function AddDomainModal({
  open,
  onClose,
  domain,
  onAdd,
  onVerify,
}: {
  open: boolean;
  onClose: () => void;
  domain: DomainSummary | null;
  onAdd: (host: string) => Promise<void>;
  onVerify: (id: string) => Promise<void>;
}) {
  const [host, setHost] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={domain ? 'Подтвердите домен' : 'Подключить домен'}
      description={domain ? 'Добавьте записи у регистратора и нажмите «Проверить».' : 'Например: example.com — без https:// и www.'}
      footer={
        domain ? (
          <>
            <Button variant="secondary" onClick={onClose}>Позже</Button>
            <Button onClick={() => onVerify(domain.id)}><CheckCircle2 size={15} /> Проверить DNS</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>Отмена</Button>
            <Button
              loading={loading}
              disabled={!host.includes('.')}
              onClick={async () => {
                setError(null);
                setLoading(true);
                try {
                  await onAdd(host.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''));
                } catch (caught) {
                  setError(errorMessage(caught));
                } finally {
                  setLoading(false);
                }
              }}
            >
              Добавить
            </Button>
          </>
        )
      }
    >
      {error && <div className="mb-3"><Alert>{error}</Alert></div>}
      {!domain ? (
        <Field label="Домен">
          <Input value={host} onChange={(event) => setHost(event.target.value)} placeholder="example.com" autoFocus />
        </Field>
      ) : (
        <div className="space-y-2">
          {domain.instructions.map((instruction) => (
            <div key={`${instruction.type}-${instruction.name}`} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
              <span className="w-14 text-[11px] font-semibold text-slate-500">{instruction.type}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{instruction.name}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-500">{instruction.value}</span>
              <button
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
                onClick={async () => {
                  await navigator.clipboard.writeText(instruction.value);
                  setCopied(instruction.value);
                }}
              >
                <Copy size={13} />
              </button>
            </div>
          ))}
          {copied && <p className="text-xs text-emerald-600">Скопировано: {copied}</p>}
        </div>
      )}
    </Modal>
  );
}
