import { headers } from 'next/headers';
import { loadSitemap } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function GET() {
  const headerList = await headers();
  const host = headerList.get('host') ?? '';
  const xml = await loadSitemap(host);
  if (!xml) return new Response('Not found', { status: 404 });
  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
}
