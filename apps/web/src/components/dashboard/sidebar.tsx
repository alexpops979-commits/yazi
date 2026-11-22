'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderKanban, Image as ImageIcon, LayoutTemplate, Lightbulb, Settings, Shield } from 'lucide-react';
import { cn } from '@/components/ui';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/projects', label: 'Проекты', icon: FolderKanban },
  { href: '/ideas', label: 'Идеи', icon: Lightbulb },
  { href: '/templates', label: 'Шаблоны', icon: LayoutTemplate },
  { href: '/media', label: 'Медиа', icon: ImageIcon },
  { href: '/settings', label: 'Настройки', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { tenant, isSuperAdmin } = useAuth();

  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">D</div>
        <div className="min-w-0">
          <p className="text-base font-semibold leading-tight tracking-tight">Dalmg</p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{tenant?.name ?? 'Рабочее пространство'}</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition',
                active
                  ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
              )}
            >
              <Icon size={16} className={active ? 'text-brand-600 dark:text-brand-300' : 'text-slate-400'} />
              {item.label}
            </Link>
          );
        })}
        {isSuperAdmin && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition',
              pathname.startsWith('/admin')
                ? 'bg-violet-50 font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-200'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900',
            )}
          >
            <Shield size={16} className="text-violet-500" />
            Админка
          </Link>
        )}
      </nav>

      <div className="mx-3 mb-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Все функции включены</p>
        <p className="mt-0.5 text-[11px] text-slate-400">Без аккаунтов, лимитов и подписки</p>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <span className="text-[11px] text-slate-400">Тема интерфейса</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
