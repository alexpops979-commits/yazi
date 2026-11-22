'use client';

import { FONT_OPTIONS } from '@dalmg/page-schema';
import { Field, Input, Select } from '@/components/ui';
import { useEditorStore } from './store';

export function ThemePanel() {
  const theme = useEditorStore((state) => state.document.theme);
  const updateTheme = useEditorStore((state) => state.updateTheme);

  return (
    <div className="space-y-5 p-3">
      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Цвета</p>
        <Color label="Основной" value={theme.colors.primary} onChange={(value) => updateTheme({ colors: { ...theme.colors, primary: value } })} />
        <Color label="Текст на основном" value={theme.colors.primaryContrast} onChange={(value) => updateTheme({ colors: { ...theme.colors, primaryContrast: value } })} />
        <Color label="Фон страницы" value={theme.colors.background} onChange={(value) => updateTheme({ colors: { ...theme.colors, background: value } })} />
        <Color label="Поверхности" value={theme.colors.surface} onChange={(value) => updateTheme({ colors: { ...theme.colors, surface: value } })} />
        <Color label="Текст" value={theme.colors.text} onChange={(value) => updateTheme({ colors: { ...theme.colors, text: value } })} />
        <Color label="Приглушённый текст" value={theme.colors.muted} onChange={(value) => updateTheme({ colors: { ...theme.colors, muted: value } })} />
        <Color label="Границы" value={theme.colors.border} onChange={(value) => updateTheme({ colors: { ...theme.colors, border: value } })} />
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Типографика</p>
        <Field label="Шрифт заголовков">
          <Select value={theme.fonts.heading} onChange={(event) => updateTheme({ fonts: { ...theme.fonts, heading: event.target.value } })}>
            {FONT_OPTIONS.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
          </Select>
        </Field>
        <Field label="Шрифт текста">
          <Select value={theme.fonts.body} onChange={(event) => updateTheme({ fonts: { ...theme.fonts, body: event.target.value } })}>
            {FONT_OPTIONS.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
          </Select>
        </Field>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Форма</p>
        <Field label="Радиус, px">
          <Input type="number" value={theme.radius} onChange={(event) => updateTheme({ radius: Number(event.target.value) || 0 })} />
        </Field>
        <Field label="Ширина контейнера, px">
          <Input type="number" value={theme.containerWidth} onChange={(event) => updateTheme({ containerWidth: Number(event.target.value) || 1120 })} />
        </Field>
      </section>

      <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-500">
        Преимущества — цвета темы применяются ко всем кнопкам, ссылкам и карточкам страницы.
      </div>
    </div>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-600">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 w-8 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
        />
        <Input value={value} onChange={(event) => onChange(event.target.value)} className="w-[92px] px-1.5 py-1 font-mono text-[10px]" />
      </div>
    </div>
  );
}
