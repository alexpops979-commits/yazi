import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { documentCss } from '@/blocks/css';
import { PageRenderer } from '@/blocks/render';
import { loadPreview } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Preview',
  robots: { index: false, follow: false },
};

export default async function PreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = await loadPreview(token);
  if (!payload) notFound();

  const document = payload.page.document;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `html,body{margin:0;padding:0;background:${document.theme.colors.background}}${documentCss(document)}` }} />
      <PageRenderer document={document} ctx={{ mode: 'preview', device: 'desktop', theme: document.theme }} />
    </>
  );
}
