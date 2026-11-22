'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { PageDetail, ProjectSummary } from '@yazi/contracts';
import { Alert, Button, Spinner } from '@/components/ui';
import { useApi, useAuth } from '@/lib/auth';
import { useAsync } from '@/lib/hooks';
import { Providers } from '@/components/providers';
import { EditorShell } from '@/components/editor/editor-shell';
import { useEditorStore } from '@/components/editor/store';

export default function EditorRoute() {
  return (
    <Providers>
      <EditorPage />
    </Providers>
  );
}

function EditorPage() {
  const params = useParams<{ projectId: string; pageId: string }>();
  const { me, loading: authLoading, tenantId } = useAuth();
  const api = useApi();
  const initializedFor = useRef<string | null>(null);

  const ready = !!me && !!tenantId;
  const page = useAsync(() => api<PageDetail>(`/pages/${params.pageId}`), [params.pageId], { enabled: ready });
  const project = useAsync(() => api<ProjectSummary>(`/projects/${params.projectId}`), [params.projectId], { enabled: ready });

  useEffect(() => {
    if (!page.data || initializedFor.current === page.data.id) return;
    initializedFor.current = page.data.id;
    useEditorStore.getState().init({
      projectId: params.projectId,
      pageId: page.data.id,
      document: page.data.document,
      revision: page.data.revision,
      title: page.data.title,
      path: page.data.path,
    });
  }, [page.data, params.projectId]);

  if (authLoading || !ready || page.loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (page.error || !page.data) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <Alert>{page.error ?? 'Страница не найдена'}</Alert>
        <Link href={`/projects/${params.projectId}`} className="mt-4 block">
          <Button variant="secondary">К проекту</Button>
        </Link>
      </div>
    );
  }

  return <EditorShell page={page.data} project={project.data} reload={page.reload} />;
}
