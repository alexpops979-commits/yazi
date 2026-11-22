'use client';

import { useRef, useState } from 'react';
import { Copy, Trash2, Upload } from 'lucide-react';
import type { MediaAssetSummary } from '@yazi/contracts';
import { Alert, Button, Card, Spinner } from '@/components/ui';
import { apiForm } from '@/lib/api';
import { useApi, useApiForm } from '@/lib/auth';
import { errorMessage, useAsync } from '@/lib/hooks';

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaPage() {
  const api = useApi();
  const assets = useAsync(() => api<MediaAssetSummary[]>('/media'), []);
  const apiUpload = useApiForm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        await apiUpload('/media', form);
      }
      await assets.reload();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Медиа</h1>
          <p className="mt-1 text-sm text-slate-500">Изображения и файлы для ваших сайтов. PNG, JPG, WEBP, SVG, MP4, PDF — до 10 МБ.</p>
        </div>
        <div>
          <input ref={inputRef} type="file" multiple accept="image/*,video/mp4,application/pdf" className="hidden" onChange={(event) => upload(event.target.files)} />
          <Button onClick={() => inputRef.current?.click()} loading={uploading}>
            <Upload size={15} /> Загрузить
          </Button>
        </div>
      </div>

      {(error || assets.error) && <div className="mt-4"><Alert>{error ?? assets.error}</Alert></div>}

      <div
        className="mt-6"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void upload(event.dataTransfer.files);
        }}
      >
        {assets.loading ? (
          <div className="flex justify-center py-20"><Spinner className="h-6 w-6" /></div>
        ) : !assets.data?.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-700">Перетащите файлы сюда</p>
            <p className="mt-1 text-xs text-slate-500">или нажмите «Загрузить»</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {assets.data.map((asset) => (
              <Card key={asset.id} className="group overflow-hidden p-0">
                <div className="relative h-32 bg-slate-100">
                  {asset.mime.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.url} alt={asset.filename} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-medium uppercase text-slate-400">
                      {asset.mime.split('/')[1]}
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="truncate text-[11px] font-medium text-slate-700">{asset.filename}</p>
                  <p className="text-[10px] text-slate-400">{formatBytes(asset.size)}</p>
                  <div className="mt-2 flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-[11px]"
                      onClick={async () => {
                        await navigator.clipboard.writeText(asset.url);
                        setCopied(asset.id);
                        window.setTimeout(() => setCopied(null), 1500);
                      }}
                    >
                      <Copy size={12} /> {copied === asset.id ? 'Скопировано' : 'URL'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!window.confirm('Удалить файл?')) return;
                        await api(`/media/${asset.id}`, { method: 'DELETE' }).catch((caught) => setError(errorMessage(caught)));
                        await assets.reload();
                      }}
                    >
                      <Trash2 size={12} className="text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
