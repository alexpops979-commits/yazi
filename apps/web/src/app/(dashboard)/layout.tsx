'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { Providers } from '@/components/providers';
import { Alert, Button, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';

function DashboardFrame({ children }: { children: React.ReactNode }) {
  const { me, loading, error, reload } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
        <Alert>Не удалось открыть рабочее пространство: {error}</Alert>
        <Button onClick={() => void reload()}>Повторить</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <DashboardFrame>{children}</DashboardFrame>
    </Providers>
  );
}
