'use client';

import { useState } from 'react';
import { Ban, CheckCircle2, Search, Shield, Trash2 } from 'lucide-react';
import type { AdminStats, AdminUserRow, TemplateSummary } from '@yazi/contracts';
import { Alert, Badge, Button, Card, Input, Spinner, Tabs, cn } from '@/components/ui';
import { useApi, useAuth } from '@/lib/auth';
import { errorMessage, timeAgo, useAsync } from '@/lib/hooks';

type Tab = 'overview' | 'users' | 'templates' | 'audit';

export default function AdminPage() {
  const api = useApi();
  const { isSuperAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState<string | null>(null);

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-16">
        <Alert>Раздел доступен только супер-администраторам платформы.</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="flex items-center gap-2">
        <Shield size={18} className="text-violet-600" />
        <h1 className="text-2xl font-semibold tracking-tight">Админка платформы</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">Пользователи, тарифы, шаблоны и статистика публикаций.</p>

      {error && <div className="mt-4"><Alert>{error}</Alert></div>}

      <Tabs
        className="mt-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Обзор' },
          { value: 'users', label: 'Пользователи' },
          { value: 'templates', label: 'Шаблоны' },
          { value: 'audit', label: 'Журнал' },
        ]}
      />

      <div className="mt-6">
        {tab === 'overview' && <Overview />}
        {tab === 'users' && <Users onError={setError} />}
        {tab === 'templates' && <TemplatesTab onError={setError} />}
        {tab === 'audit' && <Audit />}
      </div>
    </div>
  );
}

function Overview() {
  const api = useApi();
  const stats = useAsync(() => api<AdminStats>('/admin/stats'), []);
  if (stats.loading) return <Spinner className="mt-10" />;
  if (!stats.data) return <Alert>{stats.error ?? 'Нет данных'}</Alert>;

  const maxPublishes = Math.max(1, ...stats.data.publishesByDay.map((day) => day.count));
  const maxSignups = Math.max(1, ...stats.data.signupsByDay.map((day) => day.count));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Пользователи" value={stats.data.users} />
        <Metric label="Рабочие пространства" value={stats.data.tenants} />
        <Metric label="Проекты" value={stats.data.projects} />
        <Metric label="Опубликовано страниц" value={stats.data.publishedPages} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <h2 className="text-sm font-semibold">Публикации за 30 дней</h2>
          <div className="mt-4 flex h-40 items-end gap-1">
            {stats.data.publishesByDay.map((day) => (
              <div key={day.date} className="group relative flex-1">
                <div
                  className="w-full rounded-sm bg-violet-400/70 transition group-hover:bg-violet-500"
                  style={{ height: `${Math.max(4, (day.count / maxPublishes) * 150)}px` }}
                />
                <span className="pointer-events-none absolute -top-5 left-1/2 hidden -translate-x-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                  {day.count}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-slate-400">
            <span>{stats.data.publishesByDay[0]?.date}</span>
            <span>{stats.data.publishesByDay.at(-1)?.date}</span>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">Регистрации за 30 дней</h2>
          <div className="mt-4 flex h-24 items-end gap-1">
            {stats.data.signupsByDay.map((day) => (
              <div
                key={day.date}
                className="flex-1 rounded-sm bg-brand-400/70"
                title={`${day.date}: ${day.count}`}
                style={{ height: `${Math.max(4, (day.count / maxSignups) * 90)}px` }}
              />
            ))}
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
            Пространств: <span className="font-medium text-slate-800">{stats.data.tenants}</span>
            <br />
            Пользователей: <span className="font-medium text-slate-800">{stats.data.users}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

function Users({ onError }: { onError: (message: string) => void }) {
  const api = useApi();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const users = useAsync(() => api<{ data: AdminUserRow[]; total: number }>(`/admin/users?q=${encodeURIComponent(query)}&page=${page}`), [query, page]);

  return (
    <Card className="p-0">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Search size={15} className="text-slate-400" />
        <Input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(1); }}
          placeholder="Поиск по email или имени"
          className="border-0 bg-transparent px-0 focus:ring-0"
        />
      </div>
      {users.loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="divide-y divide-slate-100">
          {users.data?.data.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  {user.role === 'SUPER_ADMIN' && <Badge tone="purple">super admin</Badge>}
                  {user.status !== 'active' && <Badge tone="red">suspended</Badge>}
                </div>
                <p className="truncate text-xs text-slate-500">{user.email} · {user.planCode ?? '—'} · {timeAgo(user.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  title={user.status === 'active' ? 'Заблокировать' : 'Разблокировать'}
                  onClick={async () => {
                    try {
                      await api(`/admin/users/${user.id}`, { method: 'PATCH', body: { status: user.status === 'active' ? 'suspended' : 'active' } });
                      await users.reload();
                    } catch (caught) {
                      onError(errorMessage(caught));
                    }
                  }}
                >
                  {user.status === 'active' ? <Ban size={14} className="text-red-500" /> : <CheckCircle2 size={14} className="text-emerald-500" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Переключить роль"
                  onClick={async () => {
                    try {
                      await api(`/admin/users/${user.id}`, { method: 'PATCH', body: { role: user.role === 'SUPER_ADMIN' ? 'USER' : 'SUPER_ADMIN' } });
                      await users.reload();
                    } catch (caught) {
                      onError(errorMessage(caught));
                    }
                  }}
                >
                  <Shield size={14} className={user.role === 'SUPER_ADMIN' ? 'text-violet-500' : 'text-slate-400'} />
                </Button>
              </div>
            </div>
          ))}
          {!users.data?.data.length && <p className="px-4 py-8 text-center text-sm text-slate-500">Ничего не найдено</p>}
        </div>
      )}
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
        <span>Всего: {users.data?.total ?? 0}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Назад</Button>
          <Button size="sm" variant="ghost" disabled={(users.data?.total ?? 0) <= page * 20} onClick={() => setPage((value) => value + 1)}>Вперёд</Button>
        </div>
      </div>
    </Card>
  );
}

function TemplatesTab({ onError }: { onError: (message: string) => void }) {
  const api = useApi();
  const templates = useAsync(() => api<TemplateSummary[]>('/admin/templates'), []);

  return (
    <Card className="p-0">
      <div className="divide-y divide-slate-100">
        {templates.data?.map((template) => (
          <div key={template.id} className="flex items-center gap-3 px-4 py-3">
            <div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-slate-100">
              {template.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={template.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{template.name}</p>
              <p className="truncate text-xs text-slate-500">{template.slug} · {template.category}</p>
            </div>
            {template.isSystem && <Badge tone="purple">system</Badge>}
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (!window.confirm(`Удалить шаблон «${template.name}»?`)) return;
                try {
                  await api(`/admin/templates/${template.id}`, { method: 'DELETE' });
                  await templates.reload();
                } catch (caught) {
                  onError(errorMessage(caught));
                }
              }}
            >
              <Trash2 size={14} className="text-red-500" />
            </Button>
          </div>
        ))}
        {!templates.data?.length && <p className="px-4 py-8 text-center text-sm text-slate-500">Нет шаблонов</p>}
      </div>
    </Card>
  );
}

function Audit() {
  const api = useApi();
  const logs = useAsync(
    () => api<{ id: string; action: string; targetType: string; actor: string | null; createdAt: string; meta: unknown }[]>('/admin/audit'),
    [],
  );

  return (
    <Card className="p-0">
      <div className={cn('divide-y divide-slate-100', logs.loading && 'opacity-60')}>
        {logs.data?.map((log) => (
          <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
            <span className="w-40 shrink-0 font-mono text-[11px] text-slate-500">{log.action}</span>
            <span className="min-w-0 flex-1 truncate text-slate-700">{log.actor ?? 'system'}</span>
            <span className="shrink-0 text-slate-400">{log.targetType}</span>
            <span className="shrink-0 text-slate-400">{timeAgo(log.createdAt)}</span>
          </div>
        ))}
        {!logs.data?.length && !logs.loading && <p className="px-4 py-8 text-center text-sm text-slate-500">Пока пусто</p>}
      </div>
    </Card>
  );
}
