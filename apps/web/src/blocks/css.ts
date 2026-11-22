import { FONT_OPTIONS, walkNodes, type PageDocument, type PageNode, type StyleProps, type Theme } from '@yazi/page-schema';

/**
 * All visual rules for published pages and the editor canvas live here:
 * a tiny design system expressed as plain CSS, with per-node responsive overrides.
 */

export const BASE_CSS = `
.pb-root{background:var(--pb-bg);color:var(--pb-text);font-family:var(--pb-body-font);-webkit-font-smoothing:antialiased;line-height:1.5;overflow-x:hidden;container-type:inline-size;container-name:pb-root}
.pb-root *{box-sizing:border-box}
.pb-root img{max-width:100%}
.pb-root a{color:inherit}

.pb-section{width:100%;position:relative}
.pb-section-inner{max-width:var(--pb-container);margin:0 auto;display:flex;flex-direction:column;gap:var(--pb-gap,16px);align-items:stretch;width:100%}
.pb-stack{display:flex;flex-direction:column;gap:var(--pb-gap,16px);align-items:stretch;min-width:0}
.pb-card{background:var(--pb-surface);border:1px solid var(--pb-border);border-radius:var(--pb-radius);padding:24px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
.pb-cols{display:flex;gap:var(--pb-gap,24px);align-items:flex-start;min-width:0}
.pb-cols>*{flex:1 1 0;min-width:0}
.pb-grid{display:grid;grid-template-columns:repeat(var(--pb-cols,2),minmax(0,1fr));gap:var(--pb-gap,20px);min-width:0}
@container pb-root (max-width:1023px){.pb-grid{grid-template-columns:repeat(min(var(--pb-cols,2),2),minmax(0,1fr))}}
@container pb-root (max-width:767px){.pb-cols{flex-direction:column}.pb-cols>*{width:100%}}
@container pb-root (max-width:639px){.pb-grid{grid-template-columns:1fr}}

.pb-heading{margin:0;font-family:var(--pb-heading-font);font-weight:600;line-height:1.12;letter-spacing:-.02em;overflow-wrap:break-word}
.pb-h1{font-size:clamp(30px,4.4vw,56px)}
.pb-h2{font-size:clamp(26px,3.2vw,40px)}
.pb-h3{font-size:clamp(20px,2.2vw,26px)}
.pb-h4{font-size:18px}
.pb-h5{font-size:16px}
.pb-h6{font-size:14px;text-transform:uppercase;letter-spacing:.08em}
.pb-text{margin:0;line-height:1.7;overflow-wrap:break-word;white-space:pre-wrap}
.pb-text-sm{font-size:14px}
.pb-text-md{font-size:16px}
.pb-text-lg{font-size:19px}
.pb-muted{color:var(--pb-muted)}
.pb-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:var(--pb-surface);border:1px solid var(--pb-border);font-size:12px;font-weight:600;letter-spacing:.02em;color:var(--pb-muted);width:fit-content}
.pb-divider{border:0;border-top:1px solid var(--pb-border);width:100%;margin:0}
.pb-spacer{width:100%}

.pb-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 22px;border-radius:calc(var(--pb-radius) * .7);font-weight:600;font-size:15px;text-decoration:none;border:1px solid transparent;transition:transform .15s ease,opacity .15s ease;cursor:pointer;font-family:inherit}
.pb-btn:hover{transform:translateY(-1px)}
.pb-btn-primary{background:var(--pb-primary);color:var(--pb-primary-contrast)}
.pb-btn-secondary{border-color:color-mix(in srgb,currentColor 30%,transparent);color:inherit;background:color-mix(in srgb,currentColor 5%,transparent)}
.pb-btn-ghost{color:var(--pb-primary);background:transparent;padding-left:0;padding-right:0}
.pb-btn-sm{padding:9px 16px;font-size:14px}

.pb-nav{display:flex;align-items:center;justify-content:space-between;gap:24px;width:100%;flex-wrap:wrap}
.pb-nav-brand{font-family:var(--pb-heading-font);font-size:20px;font-weight:700;letter-spacing:-.02em;text-decoration:none;color:inherit}
.pb-nav-links{display:flex;align-items:center;gap:26px}
.pb-nav-links a{font-size:15px;text-decoration:none;opacity:.75;transition:opacity .15s}
.pb-nav-links a:hover{opacity:1}
@container pb-root (max-width:767px){.pb-nav-links{display:none}}

.pb-image{display:block;width:100%;height:auto;object-fit:cover;border-radius:var(--pb-radius);background:var(--pb-surface)}
.pb-video-frame{position:relative;width:100%;overflow:hidden;border-radius:var(--pb-radius);background:#0f172a}
.pb-video-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}

.pb-stat-value{font-family:var(--pb-heading-font);font-size:clamp(28px,3vw,40px);font-weight:700;letter-spacing:-.03em;line-height:1}
.pb-stat-label{font-size:13px;color:var(--pb-muted);margin-top:6px}

.pb-form{display:flex;flex-direction:column;gap:12px}
.pb-form-row{display:flex;flex-direction:column;gap:6px}
.pb-form-label{font-size:12px;font-weight:600;letter-spacing:.02em;color:var(--pb-muted)}
.pb-input{width:100%;padding:12px 14px;border:1px solid var(--pb-border);border-radius:calc(var(--pb-radius) * .7);background:var(--pb-bg);color:var(--pb-text);font-family:inherit;font-size:15px;outline:none}
.pb-input:focus{border-color:var(--pb-primary)}
textarea.pb-input{min-height:120px;resize:vertical}

.pb-brand-badge{position:fixed;right:14px;bottom:14px;z-index:40;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;background:rgba(15,23,42,.86);color:#fff;font-size:12px;font-family:Inter,system-ui,sans-serif;text-decoration:none;backdrop-filter:blur(6px)}
.pb-brand-badge:hover{background:rgba(15,23,42,1)}

.pb-canvas [data-pb-id]{cursor:pointer}
.pb-canvas [data-pb-editable]:focus{outline:2px dashed var(--pb-primary);outline-offset:3px}
`;

export function themeCss(theme: Theme): string {
  const font = (name: string) => `'${safeFont(name)}', ui-sans-serif, system-ui, sans-serif`;
  const color = (value: string, fallback: string) => safeColor(value) ?? fallback;
  return `.pb-root{
  --pb-primary:${color(theme.colors.primary, '#3462F4')};
  --pb-primary-contrast:${color(theme.colors.primaryContrast, '#FFFFFF')};
  --pb-text:${color(theme.colors.text, '#0F172A')};
  --pb-muted:${color(theme.colors.muted, '#64748B')};
  --pb-bg:${color(theme.colors.background, '#FFFFFF')};
  --pb-surface:${color(theme.colors.surface, '#F6F8FC')};
  --pb-border:${color(theme.colors.border, '#E2E8F0')};
  --pb-radius:${Number(theme.radius) || 0}px;
  --pb-container:${Number(theme.containerWidth) || 1120}px;
  --pb-heading-font:${font(theme.fonts.heading)};
  --pb-body-font:${font(theme.fonts.body)};
}`;
}

const COLOR_RE = /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla)\([0-9.,%\s/+-]+\)|[a-z]{3,20})$/i;

/** Theme values are user input: never interpolate arbitrary text into CSS. */
function safeColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return COLOR_RE.test(trimmed) ? trimmed : undefined;
}

function safeFont(name: string | undefined): string {
  return name && (FONT_OPTIONS as readonly string[]).includes(name) ? name : 'Inter';
}

function sanitizeCss(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style').replace(/<\/script/gi, '<\\/script');
}

export function fontsHref(theme: Theme): string {
  const families = new Set([theme.fonts.heading, theme.fonts.body]);
  const params = [...families]
    .filter(Boolean)
    .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;500;600;700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

type Decl = Record<string, string | undefined>;
type Bucket = 'desktop' | 'tablet' | 'mobile';
type AnyResponsive = { base?: unknown; mobile?: unknown; tablet?: unknown; desktop?: unknown };

function pick<T>(value: unknown, bucket: Bucket): T | undefined {
  const responsive = value as AnyResponsive | undefined;
  if (!responsive || typeof responsive !== 'object') return undefined;
  if (bucket === 'mobile') return (responsive.mobile ?? responsive.tablet ?? responsive.desktop ?? responsive.base) as T | undefined;
  if (bucket === 'tablet') return (responsive.tablet ?? responsive.desktop ?? responsive.base) as T | undefined;
  return (responsive.desktop ?? responsive.base) as T | undefined;
}

function spacing(value: unknown): string | undefined {
  if (typeof value === 'number') return `${value}px`;
  if (Array.isArray(value) && value.length === 4) return value.map((item) => `${Number(item) || 0}px`).join(' ');
  return undefined;
}

function declarations(style: StyleProps, bucket: Bucket): Decl {
  const decl: Decl = {};

  const pad = spacing(pick(style.padding, bucket));
  if (pad) decl.padding = pad;
  const marginValue = spacing(pick(style.margin, bucket));
  if (marginValue) decl.margin = marginValue;

  const gap = pick<number>(style.gap, bucket);
  if (gap !== undefined) decl['--pb-gap'] = `${gap}px`;

  const background = safeColor(pick<string>(style.background, bucket));
  if (background) decl['background-color'] = background;
  const color = safeColor(pick<string>(style.color, bucket));
  if (color) decl.color = color;

  const fontSize = pick<number>(style.fontSize, bucket);
  if (fontSize !== undefined) decl['font-size'] = `${fontSize}px`;
  const fontWeight = pick<number>(style.fontWeight, bucket);
  if (fontWeight !== undefined) decl['font-weight'] = String(fontWeight);
  const lineHeight = pick<number>(style.lineHeight, bucket);
  if (lineHeight !== undefined) decl['line-height'] = String(lineHeight);
  const letterSpacing = pick<number>(style.letterSpacing, bucket);
  if (letterSpacing !== undefined) decl['letter-spacing'] = `${letterSpacing}px`;
  const textAlign = pick<string>(style.textAlign, bucket);
  if (textAlign) decl['text-align'] = textAlign;

  const radius = pick<number>(style.radius, bucket);
  if (radius !== undefined) decl['border-radius'] = `${radius}px`;
  const maxWidth = pick<number>(style.maxWidth, bucket);
  if (maxWidth !== undefined) {
    decl['max-width'] = `${maxWidth}px`;
    decl['margin-left'] = 'auto';
    decl['margin-right'] = 'auto';
    decl.width = '100%';
  }
  const minHeight = pick<number>(style.minHeight, bucket);
  if (minHeight !== undefined) decl['min-height'] = `${minHeight}px`;

  const align = pick<string>(style.align, bucket);
  if (align) decl['align-items'] = align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : align;
  const justify = pick<string>(style.justify, bucket);
  if (justify) decl['justify-content'] = justify === 'between' ? 'space-between' : justify === 'start' ? 'flex-start' : justify === 'end' ? 'flex-end' : 'center';

  const borderColor = safeColor(pick<string>(style.borderColor, bucket));
  if (borderColor) decl['border-color'] = borderColor;
  const borderWidth = pick<number>(style.borderWidth, bucket);
  if (borderWidth !== undefined) decl['border-width'] = `${borderWidth}px`;
  if ((borderColor || borderWidth !== undefined) && !decl['border-style']) decl['border-style'] = 'solid';

  const shadow = pick<string>(style.shadow, bucket);
  if (shadow) {
    decl['box-shadow'] =
      shadow === 'none'
        ? 'none'
        : shadow === 'sm'
          ? '0 1px 2px rgba(16,24,40,.06)'
          : shadow === 'md'
            ? '0 8px 24px rgba(16,24,40,.1)'
            : '0 24px 60px rgba(16,24,40,.16)';
  }
  const opacity = pick<number>(style.opacity, bucket);
  if (opacity !== undefined) decl.opacity = String(opacity);

  const hidden = style.hidden;
  if (hidden?.includes(bucket)) decl.display = 'none';

  return decl;
}

function diff(base: Decl, next: Decl): Decl {
  const out: Decl = {};
  for (const [key, value] of Object.entries(next)) {
    if (base[key] !== value) out[key] = value;
  }
  return out;
}

function rule(selector: string, decl: Decl): string {
  const body = Object.entries(decl)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
  return body ? `${selector}{${body}}` : '';
}

export function buildCss(document: PageDocument): string {
  const chunks: string[] = [];
  walkNodes(document.sections, (node) => {
    const selector = `.pb-root .pb-${node.id}`;
    const desktop = declarations(node.style, 'desktop');
    const tablet = declarations(node.style, 'tablet');
    const mobile = declarations(node.style, 'mobile');

    const desktopRule = rule(selector, desktop);
    if (desktopRule) chunks.push(desktopRule);

    const tabletRule = rule(selector, diff(desktop, tablet));
    if (tabletRule) chunks.push(`@container pb-root (max-width:1023px){${tabletRule}}`);

    const mobileRule = rule(selector, diff(tablet, mobile));
    if (mobileRule) chunks.push(`@container pb-root (max-width:639px){${mobileRule}}`);
  });
  return chunks.join('\n');
}

export function documentCss(document: PageDocument): string {
  return sanitizeCss(`${themeCss(document.theme)}\n${BASE_CSS}\n${buildCss(document)}`);
}
