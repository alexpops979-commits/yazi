'use client';

import { useEffect, useState } from 'react';
import { Copy, ImagePlus, Trash2 } from 'lucide-react';
import type { PageNode, StyleProps } from '@yazi/page-schema';
import { findNode } from '@yazi/page-schema';
import { getBlockDefinition } from '@/blocks/registry';
import type { Control } from '@/blocks/types';
import { collectionToText } from '@/blocks/types';
import { Button, Field, Input, Select, Textarea, cn } from '@/components/ui';
import { MediaPicker } from './media-picker';
import { useEditorStore } from './store';

/* ── Design inspector ───────────────────────────────────── */

export function Inspector() {
  const document = useEditorStore((state) => state.document);
  const selectedId = useEditorStore((state) => state.selectedId);
  const node = selectedId ? findNode(document.sections, selectedId) : null;

  return (
    <div className="p-3">
      {!node ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-400">
          Выберите блок на странице, чтобы изменить его свойства
        </div>
      ) : (
        <NodeInspector node={node} />
      )}
    </div>
  );
}

function NodeInspector({ node }: { node: PageNode }) {
  const definition = getBlockDefinition(node.type);
  const updateProps = useEditorStore((state) => state.updateProps);
  const updateStyle = useEditorStore((state) => state.updateStyle);
  const removeBlock = useEditorStore((state) => state.removeBlock);
  const duplicateBlock = useEditorStore((state) => state.duplicateBlock);
  const [mediaKey, setMediaKey] = useState<string | null>(null);

  const props = node.props as Record<string, unknown>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-800">{definition?.title ?? node.type}</p>
          <p className="truncate font-mono text-[10px] text-slate-400">{node.id}</p>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100" onClick={() => duplicateBlock(node.id)} title="Дублировать">
            <Copy size={13} />
          </button>
          <button className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" onClick={() => removeBlock(node.id)} title="Удалить">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {!!definition?.controls.length && (
        <section className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Содержимое</p>
          {definition.controls.map((control) => (
            <ControlField
              key={`${control.kind}-${control.key}`}
              control={control}
              value={props[control.key]}
              onChange={(value) => updateProps(node.id, { [control.key]: value })}
              onPickMedia={() => setMediaKey(control.key)}
            />
          ))}
        </section>
      )}

      <StyleSection node={node} onChange={(patch) => updateStyle(node.id, patch)} />

      <MediaPicker
        open={!!mediaKey}
        onClose={() => setMediaKey(null)}
        onSelect={(url) => {
          if (mediaKey) updateProps(node.id, { [mediaKey]: url });
          setMediaKey(null);
        }}
      />
    </div>
  );
}

function ControlField({
  control,
  value,
  onChange,
  onPickMedia,
}: {
  control: Control;
  value: unknown;
  onChange: (value: unknown) => void;
  onPickMedia: () => void;
}) {
  switch (control.kind) {
    case 'text':
    case 'url':
      return (
        <Field label={control.label}>
          <Input value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} placeholder={control.placeholder} />
        </Field>
      );
    case 'textarea':
      return (
        <Field label={control.label}>
          <Textarea
            rows={control.rows ?? 3}
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => onChange(event.target.value)}
            placeholder={control.placeholder}
            className="text-xs"
          />
        </Field>
      );
    case 'number':
      return (
        <Field label={control.label}>
          <Input
            type="number"
            min={control.min}
            max={control.max}
            step={control.step ?? 1}
            value={typeof value === 'number' ? value : ''}
            onChange={(event) => onChange(event.target.value === '' ? 0 : Number(event.target.value))}
          />
        </Field>
      );
    case 'select':
      return (
        <Field label={control.label}>
          <Select
            value={String(value ?? '')}
            onChange={(event) => {
              const option = control.options.find((item) => String(item.value) === event.target.value);
              onChange(option?.value ?? event.target.value);
            }}
          >
            {control.options.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      );
    case 'toggle':
      return (
        <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-2">
          <span className="text-xs font-medium text-slate-600">{control.label}</span>
          <input type="checkbox" checked={!!value} onChange={(event) => onChange(event.target.checked)} className="h-3.5 w-3.5 accent-brand-600" />
        </label>
      );
    case 'color':
      return <ColorField label={control.label} value={typeof value === 'string' ? value : '#000000'} onChange={(next) => onChange(next)} />;
    case 'image':
      return (
        <Field label={control.label}>
          <div className="flex items-center gap-2">
            <div className="h-10 w-14 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50">
              {typeof value === 'string' && value ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={value} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <Button size="sm" variant="secondary" onClick={onPickMedia} type="button">
              <ImagePlus size={13} /> Выбрать
            </Button>
          </div>
          <Input className="mt-2 text-[11px]" value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} placeholder="https://…" />
        </Field>
      );
    case 'links':
    case 'fields':
      return (
        <Field label={control.label} hint="По одному на строку, через |">
          <Textarea
            rows={4}
            className="font-mono text-[11px]"
            value={collectionToText(value)}
            onChange={(event) => onChange(event.target.value)}
          />
        </Field>
      );
    default:
      return null;
  }
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(event) => onChange(event.target.value)} className="h-8 w-9 cursor-pointer rounded border border-slate-200 bg-white p-0.5" />
        <Input value={value} onChange={(event) => onChange(event.target.value)} className="font-mono text-[11px]" />
      </div>
    </Field>
  );
}

/* ── Style inspector (device aware) ─────────────────────── */

type Bucket = 'desktop' | 'tablet' | 'mobile';

function StyleSection({ node, onChange }: { node: PageNode; onChange: (patch: StyleProps) => void }) {
  const device = useEditorStore((state) => state.device);
  const bucket: Bucket = device;

  const style = node.style ?? {};
  const paddingValue = resolveSpacing(style.padding, bucket);
  const gap = resolveNumber(style.gap, bucket);
  const fontSize = resolveNumber(style.fontSize, bucket);
  const maxWidth = resolveNumber(style.maxWidth, bucket);
  const radius = resolveNumber(style.radius, bucket);
  const background = resolveString(style.background, bucket) ?? '';
  const color = resolveString(style.color, bucket) ?? '';
  const align = resolveString(style.textAlign, bucket) ?? '';
  const hidden = style.hidden ?? [];

  const setResponsive = (key: keyof StyleProps, value: number | undefined) => {
    onChange({ [key]: { ...(style[key] as object | undefined), [bucket]: value } } as StyleProps);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Стиль</p>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{device}</span>
      </div>

      <Field label="Отступы">
        <div className="grid grid-cols-4 gap-1">
          {['T', 'R', 'B', 'L'].map((label, index) => (
            <div key={label}>
              <span className="mb-0.5 block text-center text-[9px] text-slate-400">{label}</span>
              <Input
                type="number"
                className="px-1 py-1 text-center text-[11px]"
                value={paddingValue[index]}
                onChange={(event) => {
                  const next = [...paddingValue] as [number, number, number, number];
                  next[index] = Number(event.target.value) || 0;
                  onChange({ padding: { ...(style.padding as object | undefined), [bucket]: next } } as StyleProps);
                }}
              />
            </div>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <NumberControl label="Gap" value={gap} onChange={(value) => setResponsive('gap', value)} />
        <NumberControl label="Размер текста" value={fontSize} onChange={(value) => setResponsive('fontSize', value)} />
        <NumberControl label="Max width" value={maxWidth} onChange={(value) => setResponsive('maxWidth', value)} />
        <NumberControl label="Радиус" value={radius} onChange={(value) => setResponsive('radius', value)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ColorField label="Фон" value={background} onChange={(value) => onChange({ background: { ...(style.background as object | undefined), base: value } } as StyleProps)} />
        <ColorField label="Цвет текста" value={color} onChange={(value) => onChange({ color: { ...(style.color as object | undefined), base: value } } as StyleProps)} />
      </div>

      <Field label="Выравнивание текста">
        <div className="flex gap-1">
          {[
            { value: 'left', label: 'Слева' },
            { value: 'center', label: 'Центр' },
            { value: 'right', label: 'Справа' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ textAlign: { ...(style.textAlign as object | undefined), base: option.value as 'left' | 'center' | 'right' } })}
              className={cn(
                'flex-1 rounded-md border px-1 py-1.5 text-[10px] font-medium transition',
                align === option.value ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Field>

      <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-2">
        <span className="text-xs font-medium text-slate-600">Скрыть на {device}</span>
        <input
          type="checkbox"
          checked={hidden.includes(device)}
          onChange={(event) => {
            const next = event.target.checked ? [...hidden, device] : hidden.filter((item) => item !== device);
            onChange({ hidden: Array.from(new Set(next)) });
          }}
          className="h-3.5 w-3.5 accent-brand-600"
        />
      </label>
    </section>
  );
}

function NumberControl({ label, value, onChange }: { label: string; value: number | undefined; onChange: (value: number | undefined) => void }) {
  return (
    <div>
      <span className="mb-1 block text-[10px] font-medium text-slate-500">{label}</span>
      <Input
        type="number"
        className="px-2 py-1.5 text-[11px]"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? undefined : Number(event.target.value))}
      />
    </div>
  );
}

function resolveNumber(value: unknown, device: Bucket): number | undefined {
  if (typeof value === 'number') return value;
  if (!value || typeof value !== 'object') return undefined;
  const responsive = value as Record<string, number | undefined>;
  if (device === 'mobile') return responsive.mobile ?? responsive.tablet ?? responsive.desktop ?? responsive.base;
  if (device === 'tablet') return responsive.tablet ?? responsive.desktop ?? responsive.base;
  return responsive.desktop ?? responsive.base;
}

function resolveString(value: unknown, device: Bucket): string | undefined {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return undefined;
  const responsive = value as Record<string, string | undefined>;
  if (device === 'mobile') return responsive.mobile ?? responsive.tablet ?? responsive.desktop ?? responsive.base;
  if (device === 'tablet') return responsive.tablet ?? responsive.desktop ?? responsive.base;
  return responsive.desktop ?? responsive.base;
}

function resolveSpacing(value: unknown, device: Bucket): [number, number, number, number] {
  const raw = resolveUnknown(value, device);
  if (typeof raw === 'number') return [raw, raw, raw, raw];
  if (Array.isArray(raw) && raw.length === 4) return raw.map((item) => Number(item) || 0) as [number, number, number, number];
  return [0, 0, 0, 0];
}

function resolveUnknown(value: unknown, device: Bucket): unknown {
  if (!value || typeof value !== 'object') return value;
  const responsive = value as Record<string, unknown>;
  if (device === 'mobile') return responsive.mobile ?? responsive.tablet ?? responsive.desktop ?? responsive.base;
  if (device === 'tablet') return responsive.tablet ?? responsive.desktop ?? responsive.base;
  return responsive.desktop ?? responsive.base;
}

/* ── Page settings ──────────────────────────────────────── */

export function PageSettings({
  saving,
  onSave,
}: {
  saving: boolean;
  onSave: (meta: { title: string; path: string }) => Promise<void>;
}) {
  const title = useEditorStore((state) => state.title);
  const path = useEditorStore((state) => state.path);
  const setTitle = useEditorStore((state) => state.setTitle);
  const setPath = useEditorStore((state) => state.setPath);
  const [localTitle, setLocalTitle] = useState(title);
  const [localPath, setLocalPath] = useState(path);

  useEffect(() => setLocalTitle(title), [title]);
  useEffect(() => setLocalPath(path), [path]);

  return (
    <div className="space-y-4 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Страница</p>
      <Field label="Название">
        <Input value={localTitle} onChange={(event) => setLocalTitle(event.target.value)} />
      </Field>
      <Field label="Путь" hint="Латиница, цифры и дефисы">
        <Input value={localPath} onChange={(event) => setLocalPath(event.target.value)} className="font-mono text-xs" />
      </Field>
      <Button
        size="sm"
        variant="secondary"
        className="w-full"
        loading={saving}
        onClick={async () => {
          setTitle(localTitle);
          setPath(localPath);
          await onSave({ title: localTitle, path: localPath });
        }}
      >
        Сохранить страницу
      </Button>
      <p className="text-[11px] leading-relaxed text-slate-400">
        Заголовок и путь используются на вкладке браузера и в навигации сайта. SEO по умолчанию настраивается в настройках проекта.
      </p>
    </div>
  );
}
