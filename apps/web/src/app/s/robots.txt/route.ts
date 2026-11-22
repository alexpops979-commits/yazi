import { headers } from 'next/headers';
import { loadRobots } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function GET() {
  const headerList = await headers();
  const host = headerList.get('host') ?? '';
  const text = await loadRobots(host);
  return new Response(text, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
}
