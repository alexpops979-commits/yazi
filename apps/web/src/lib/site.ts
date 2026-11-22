import { cache } from 'react';
import type { PublicSitePayload, PageDetail } from '@dalmg/contracts';
import type { PageDocument } from '@dalmg/page-schema';

export function apiBase(): string {
  return process.env.API_INTERNAL_URL ?? process.env.API_PUBLIC_URL ?? 'http://127.0.0.1:3001';
}

export function normalizePath(input: string | undefined): string {
  if (!input) return '/';
  let path = input.toLowerCase();
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path.replace(/\/{2,}/g, '/');
}

export const loadSite = cache(async (host: string, path: string): Promise<PublicSitePayload | null> => {
  try {
    const response = await fetch(
      `${apiBase()}/public/resolve?host=${encodeURIComponent(host)}&path=${encodeURIComponent(path)}`,
      { cache: 'no-store' },
    );
    if (!response.ok) return null;
    return (await response.json()) as PublicSitePayload;
  } catch {
    return null;
  }
});

type PreviewPayload = {
  project: { id: string; name: string; theme: unknown; seo: Record<string, string | undefined>; faviconUrl: string | null };
  page: { id: string; title: string; path: string; seo: Record<string, string | undefined>; document: PageDocument; revision: number };
};

export const loadPreview = cache(async (token: string): Promise<PreviewPayload | null> => {
  try {
    const response = await fetch(`${apiBase()}/public/preview?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as PreviewPayload;
  } catch {
    return null;
  }
});

export async function trackPageView(host: string, path: string): Promise<void> {
  try {
    await fetch(`${apiBase()}/public/pageview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ host, path }),
    });
  } catch {
    // analytics must never break rendering
  }
}

export async function loadSitemap(host: string): Promise<string | null> {
  try {
    const response = await fetch(`${apiBase()}/public/sitemap?host=${encodeURIComponent(host)}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function loadRobots(host: string): Promise<string> {
  try {
    const response = await fetch(`${apiBase()}/public/robots?host=${encodeURIComponent(host)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('failed');
    return await response.text();
  } catch {
    return 'User-agent: *\nDisallow:\n';
  }
}

export type { PageDetail };
