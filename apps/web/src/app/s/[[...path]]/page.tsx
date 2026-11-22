import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { documentCss } from '@/blocks/css';
import { PageRenderer } from '@/blocks/render';
import { loadSite, normalizePath, trackPageView } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = { params: Promise<{ path?: string[] }> };

async function resolveHostAndPath(params: Props['params']) {
  const { path: segments = [] } = await params;
  const headerList = await headers();
  const host = headerList.get('host') ?? '';
  const path = normalizePath(`/${segments.join('/')}`);
  return { host, path };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { host, path } = await resolveHostAndPath(params);
  const payload = await loadSite(host, path);
  if (!payload) return { title: 'Not found', robots: { index: false } };

  const seo = { ...payload.project.seo, ...payload.page.seo };
  const scheme = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return {
    title: seo.title || `${payload.page.title} — ${payload.project.name}`,
    description: seo.description,
    keywords: seo.keywords,
    robots: seo.noindex ? { index: false, follow: false } : undefined,
    alternates: { canonical: `${scheme}://${host}${payload.page.path === '/' ? '' : payload.page.path}` },
    openGraph: {
      title: seo.title || payload.page.title,
      description: seo.description,
      images: seo.ogImage ? [seo.ogImage] : undefined,
    },
    icons: payload.project.faviconUrl ? { icon: payload.project.faviconUrl } : undefined,
  };
}

export default async function PublishedSitePage({ params }: Props) {
  const { host, path } = await resolveHostAndPath(params);
  const payload = await loadSite(host, path);
  if (!payload) notFound();

  const document = payload.page.document;
  const css = documentCss(document);
  const background = document.theme.colors.background;

  void trackPageView(host, payload.page.path);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `html,body{margin:0;padding:0;background:${background}}${css}` }} />
      <PageRenderer document={document} ctx={{ mode: 'published', device: 'desktop', theme: document.theme }} />
      {payload.project.branding && (
        <a className="pb-brand-badge" href="https://dalmg.dev" target="_blank" rel="noopener">
          ⚡ Сделано в Dalmg
        </a>
      )}
      {payload.project.customCode ? <div dangerouslySetInnerHTML={{ __html: payload.project.customCode }} /> : null}
    </>
  );
}
