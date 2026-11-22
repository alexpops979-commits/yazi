'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
import { ThemeToggle } from '@/components/theme-toggle';
import { useApi, useAuth } from '@/lib/auth';

export default function SettingsPage() {
  const api = useApi();
  const { tenant, reload } = useAuth();
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(tenant?.name ?? '');
  }, [tenant?.name]);

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
      <p className="mt-1 text-sm text-slate-500">Рабочее пространство и оформление. Аккаунтов больше нет — вход не требуется.</p>

      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      {message && <div className="mt-4"><Alert tone="green">{message}</Alert></div>}

      <Card className="mt-6 space-y-4">
        <h2 className="text-sm font-semibold">Рабочее пространство</h2>
        <Field label="Название">
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={async () => {
              setError(null);
              try {
                await api('/workspace', { method: 'PATCH', body: { name } });
                await reload();
                setMessage('Название обновлено');
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : 'Не удалось сохранить');
              }
            }}
          >
            Сохранить
          </Button>
        </div>
      </Card>

      <Card className="mt-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Тема интерфейса</h2>
          <p className="mt-1 text-xs text-slate-500">Светлая или тёмная — сохраняется в браузере.</p>
        </div>
        <ThemeToggle className="h-9 w-9 border border-slate-200 dark:border-slate-700" />
      </Card>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold">Режим работы</h2>
        <ul className="mt-2 space-y-1 text-xs text-slate-500">
          <li>· Аккаунты, регистрация и вход отключены — приложение открывается сразу.</li>
          <li>· Все функции доступны без лимитов и подписки.</li>
          <li>· Данные хранятся в вашем PostgreSQL.</li>
        </ul>
      </Card>
    </div>
  );
}
