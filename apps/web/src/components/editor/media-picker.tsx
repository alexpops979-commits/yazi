'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import type { MediaAssetSummary } from '@yazi/contracts';
import { Alert, Button, Modal, Spinner } from '@/components/ui';
import { useApi, useApiForm } from '@/lib/auth';
import { errorMessage, useAsync } from '@/lib/hooks';

export function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const api = useApi();
  const upload = useApiForm();
  const assets = useAsync(() => (open ? api<MediaAssetSummary[]>('/media') : Promise.resolve([])), [open]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal open={open} onClose={onClose} title="Медиа" description="Выберите файл или загрузите новый." width="lg">
      {error && <div className="mb-3"><Alert>{error}</Alert></div>}
      <div className="mb-3 flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setUploading(true);
            setError(null);
            try {
              const form = new FormData();
              form.append('file', file);
              const asset = await upload<MediaAssetSummary>('/media', form);
              onSelect(asset.url);
            } catch (caught) {
              setError(errorMessage(caught));
            } finally {
              setUploading(false);
              if (inputRef.current) inputRef.current.value = '';
            }
          }}
        />
        <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} loading={uploading}>
          <Upload size={14} /> Загрузить
        </Button>
      </div>

      {assets.loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="grid max-h-[420px] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
          {assets.data?.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onSelect(asset.url)}
              className="group overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition hover:border-brand-400"
              title={asset.filename}
            >
              <div className="h-20 w-full">
                {asset.mime.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.url} alt={asset.filename} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-[10px] uppercase text-slate-400">{asset.mime.split('/')[1]}</div>
                )}
              </div>
            </button>
          ))}
          {!assets.data?.length && <p className="col-span-full py-8 text-center text-sm text-slate-500">Пока нет файлов</p>}
        </div>
      )}
    </Modal>
  );
}
