import type { ReactNode } from 'react';
import {
  AlignLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  Check,
  Clock,
  Columns3,
  CreditCard,
  Divide,
  Frame,
  Globe,
  Grid3x3,
  Heading,
  Heart,
  Image as ImageIcon,
  Layers,
  Layout as LayoutIcon,
  ListChecks,
  Mail,
  MapPin,
  MessageSquare,
  Minus,
  MousePointerClick,
  Phone,
  Play,
  Sparkles,
  Square,
  Star,
  Type,
  Users,
  Zap,
} from 'lucide-react';
import type { PageNode } from '@yazi/page-schema';
import { blockClass, num, parseFields, parseLinks, str, type BlockDefinition, type RenderContext } from './types';

const ICON_MAP = {
  check: Check,
  star: Star,
  heart: Heart,
  bolt: Zap,
  shield: BadgeCheck,
  clock: Clock,
  mail: Mail,
  phone: Phone,
  map: MapPin,
  'arrow-right': ArrowRight,
  sparkles: Sparkles,
  users: Users,
  award: Award,
  globe: Globe,
} as const;

const ICON_OPTIONS = Object.keys(ICON_MAP).map((name) => ({ label: name, value: name }));

const RATIOS = ['16/9', '4/3', '3/2', '1/1', '4/5', '3/4', '21/9', 'auto'];

function editableProps(ctx: RenderContext, node: PageNode, field: string) {
  if (ctx.mode !== 'editor') return {};
  const editing = ctx.editingId === node.id;
  return {
    'data-pb-editable': field,
    contentEditable: editing || undefined,
    suppressContentEditableWarning: true,
    onBlur: editing
      ? (event: React.FocusEvent<HTMLElement>) => {
          ctx.onTextCommit?.(node.id, field, event.currentTarget.innerText);
          ctx.onEditEnd?.();
        }
      : undefined,
    onKeyDown: editing
      ? (event: React.KeyboardEvent<HTMLElement>) => {
          if (event.key === 'Escape') event.currentTarget.blur();
        }
      : undefined,
  };
}

function ratioStyle(ratio: unknown) {
  const value = str(ratio, '16/9');
  return value === 'auto' ? {} : { aspectRatio: value.replace('/', ' / ') };
}

/* ══════════════════════════════════════════════════════════
 *  Layout
 * ══════════════════════════════════════════════════════════ */

const section: BlockDefinition = {
  type: 'section',
  title: 'Секция',
  category: 'layout',
  icon: LayoutIcon,
  description: 'Полноширинный блок с внутренним контейнером',
  defaultProps: { tag: 'section', container: true },
  defaultStyle: { padding: { base: [72, 24, 72, 24], mobile: [44, 16, 44, 16] } },
  acceptsChildren: true,
  controls: [
    { kind: 'select', key: 'tag', label: 'HTML-тег', options: ['section', 'header', 'footer', 'div'].map((value) => ({ label: value, value })) },
    { kind: 'toggle', key: 'container', label: 'Ограничить ширину контейнера' },
  ],
  render: ({ node, props, children }) => {
    const Tag = (str(props.tag, 'section') || 'section') as 'section';
    return (
      <Tag data-pb-id={node.id} data-pb-type="section" className={blockClass(node, 'pb-section')}>
        {props.container === false ? children : <div className="pb-section-inner">{children}</div>}
      </Tag>
    );
  },
};

const container: BlockDefinition = {
  type: 'container',
  title: 'Контейнер',
  category: 'layout',
  icon: Frame,
  description: 'Группа элементов или карточка',
  defaultProps: { card: false },
  defaultStyle: { gap: { base: 16 } },
  acceptsChildren: true,
  controls: [{ kind: 'toggle', key: 'card', label: 'Оформить как карточку' }],
  render: ({ node, props, children }) => (
    <div data-pb-id={node.id} data-pb-type="container" className={blockClass(node, `pb-stack ${props.card ? 'pb-card' : ''}`)}>
      {children}
    </div>
  ),
};

const columns: BlockDefinition = {
  type: 'columns',
  title: 'Колонки',
  category: 'layout',
  icon: Columns3,
  description: 'Блоки в ряд, на мобильном — в столбик',
  defaultProps: {},
  defaultStyle: { gap: { base: 24 } },
  acceptsChildren: true,
  controls: [],
  render: ({ node, children }) => (
    <div data-pb-id={node.id} data-pb-type="columns" className={blockClass(node, 'pb-cols')}>
      {children}
    </div>
  ),
};

const grid: BlockDefinition = {
  type: 'grid',
  title: 'Сетка',
  category: 'layout',
  icon: Grid3x3,
  description: 'Адаптивная сетка карточек',
  defaultProps: { cols: 3 },
  defaultStyle: { gap: { base: 20 } },
  acceptsChildren: true,
  controls: [
    {
      kind: 'select',
      key: 'cols',
      label: 'Колонок на десктопе',
      options: [1, 2, 3, 4].map((value) => ({ label: String(value), value })),
    },
  ],
  render: ({ node, props, children }) => (
    <div
      data-pb-id={node.id}
      data-pb-type="grid"
      className={blockClass(node, 'pb-grid')}
      style={{ ['--pb-cols' as string]: String(num(props.cols, 2)) } as React.CSSProperties}
    >
      {children}
    </div>
  ),
};

/* ══════════════════════════════════════════════════════════
 *  Basic
 * ══════════════════════════════════════════════════════════ */

const heading: BlockDefinition = {
  type: 'heading',
  title: 'Заголовок',
  category: 'basic',
  icon: Heading,
  defaultProps: { text: 'Заголовок', level: 2, align: 'left' },
  defaultStyle: {},
  controls: [
    { kind: 'textarea', key: 'text', label: 'Текст', rows: 2 },
    { kind: 'select', key: 'level', label: 'Уровень', options: [1, 2, 3, 4, 5, 6].map((value) => ({ label: `H${value}`, value })) },
  ],
  render: ({ node, props, ctx }) => {
    const level = Math.min(6, Math.max(1, num(props.level, 2)));
    const Tag = `h${level}` as 'h2';
    return (
      <Tag
        data-pb-id={node.id}
        data-pb-type="heading"
        className={blockClass(node, `pb-heading pb-h${level}`)}
        {...(editableProps(ctx, node, 'text') as Record<string, unknown>)}
      >
        {str(props.text, 'Заголовок')}
      </Tag>
    );
  },
};

const text: BlockDefinition = {
  type: 'text',
  title: 'Текст',
  category: 'basic',
  icon: Type,
  defaultProps: { text: 'Текст абзаца', size: 'md', muted: false, align: 'left' },
  controls: [
    { kind: 'textarea', key: 'text', label: 'Текст', rows: 5 },
    { kind: 'select', key: 'size', label: 'Размер', options: ['sm', 'md', 'lg'].map((value) => ({ label: value, value })) },
    { kind: 'toggle', key: 'muted', label: 'Приглушённый цвет' },
  ],
  render: ({ node, props, ctx }) => (
    <p
      data-pb-id={node.id}
      data-pb-type="text"
      className={blockClass(node, `pb-text pb-text-${str(props.size, 'md')} ${props.muted ? 'pb-muted' : ''}`)}
      style={{ textAlign: str(props.align, 'left') as React.CSSProperties['textAlign'] }}
      {...(editableProps(ctx, node, 'text') as Record<string, unknown>)}
    >
      {str(props.text, '')}
    </p>
  ),
};

const button: BlockDefinition = {
  type: 'button',
  title: 'Кнопка',
  category: 'basic',
  icon: MousePointerClick,
  defaultProps: { label: 'Кнопка', href: '#', variant: 'primary', align: 'left' },
  controls: [
    { kind: 'text', key: 'label', label: 'Текст' },
    { kind: 'url', key: 'href', label: 'Ссылка' },
    {
      kind: 'select',
      key: 'variant',
      label: 'Стиль',
      options: [
        { label: 'Основная', value: 'primary' },
        { label: 'Второстепенная', value: 'secondary' },
        { label: 'Ссылка', value: 'ghost' },
      ],
    },
    {
      kind: 'select',
      key: 'align',
      label: 'Выравнивание',
      options: [
        { label: 'Слева', value: 'left' },
        { label: 'По центру', value: 'center' },
        { label: 'Справа', value: 'right' },
      ],
    },
  ],
  render: ({ node, props, ctx }) => (
    <div data-pb-id={node.id} data-pb-type="button" className={blockClass(node, '')} style={{ textAlign: str(props.align, 'left') as React.CSSProperties['textAlign'] }}>
      <a
        className={`pb-btn pb-btn-${str(props.variant, 'primary')}`}
        href={str(props.href, '#')}
        onClick={ctx.mode === 'editor' ? (event) => event.preventDefault() : undefined}
      >
        <span {...(editableProps(ctx, node, 'label') as Record<string, unknown>)}>{str(props.label, 'Кнопка')}</span>
      </a>
    </div>
  ),
};

const badge: BlockDefinition = {
  type: 'badge',
  title: 'Бейдж',
  category: 'basic',
  icon: BadgeCheck,
  defaultProps: { text: 'Новинка' },
  controls: [{ kind: 'text', key: 'text', label: 'Текст' }],
  render: ({ node, props, ctx }) => (
    <div data-pb-id={node.id} data-pb-type="badge" className={blockClass(node, '')}>
      <span className="pb-badge" {...(editableProps(ctx, node, 'text') as Record<string, unknown>)}>
        {str(props.text, 'Бейдж')}
      </span>
    </div>
  ),
};

const divider: BlockDefinition = {
  type: 'divider',
  title: 'Разделитель',
  category: 'basic',
  icon: Minus,
  defaultProps: {},
  controls: [],
  render: ({ node }) => <hr data-pb-id={node.id} data-pb-type="divider" className={blockClass(node, 'pb-divider')} />,
};

const spacer: BlockDefinition = {
  type: 'spacer',
  title: 'Отступ',
  category: 'basic',
  icon: Divide,
  defaultProps: { size: 48 },
  controls: [{ kind: 'number', key: 'size', label: 'Высота, px', min: 0, max: 400 }],
  render: ({ node, props }) => (
    <div data-pb-id={node.id} data-pb-type="spacer" className={blockClass(node, 'pb-spacer')} style={{ height: `${num(props.size, 48)}px` }} />
  ),
};

const iconBlock: BlockDefinition = {
  type: 'icon',
  title: 'Иконка',
  category: 'basic',
  icon: Sparkles,
  defaultProps: { name: 'check', size: 24 },
  controls: [
    { kind: 'select', key: 'name', label: 'Иконка', options: ICON_OPTIONS },
    { kind: 'number', key: 'size', label: 'Размер', min: 12, max: 96 },
  ],
  render: ({ node, props }) => {
    const Icon = ICON_MAP[str(props.name, 'check') as keyof typeof ICON_MAP] ?? Check;
    return (
      <div data-pb-id={node.id} data-pb-type="icon" className={blockClass(node, '')}>
        <Icon size={num(props.size, 24)} />
      </div>
    );
  },
};

const stat: BlockDefinition = {
  type: 'stat',
  title: 'Показатель',
  category: 'basic',
  icon: ListChecks,
  defaultProps: { value: '80+', label: 'Клиентов' },
  controls: [
    { kind: 'text', key: 'value', label: 'Значение' },
    { kind: 'text', key: 'label', label: 'Подпись' },
  ],
  render: ({ node, props, ctx }) => (
    <div data-pb-id={node.id} data-pb-type="stat" className={blockClass(node, '')}>
      <div className="pb-stat-value" {...(editableProps(ctx, node, 'value') as Record<string, unknown>)}>
        {str(props.value, '—')}
      </div>
      <div className="pb-stat-label">{str(props.label, '')}</div>
    </div>
  ),
};

/* ══════════════════════════════════════════════════════════
 *  Media
 * ══════════════════════════════════════════════════════════ */

const image: BlockDefinition = {
  type: 'image',
  title: 'Изображение',
  category: 'media',
  icon: ImageIcon,
  defaultProps: { src: '', alt: '', ratio: '16/9', rounded: true },
  controls: [
    { kind: 'image', key: 'src', label: 'Изображение' },
    { kind: 'text', key: 'alt', label: 'Alt-текст' },
    { kind: 'select', key: 'ratio', label: 'Пропорции', options: RATIOS.map((value) => ({ label: value, value })) },
  ],
  render: ({ node, props, ctx }) => {
    const src = str(props.src);
    if (!src) {
      return (
        <div
          data-pb-id={node.id}
          data-pb-type="image"
          className={blockClass(node, '')}
          style={{ ...ratioStyle(props.ratio), display: 'grid', placeItems: 'center', background: 'var(--pb-surface)', border: '1px dashed var(--pb-border)', borderRadius: 'var(--pb-radius)', color: 'var(--pb-muted)', minHeight: 160 }}
        >
          <span style={{ fontSize: 13 }}>Выберите изображение</span>
        </div>
      );
    }
    return (
      <img
        data-pb-id={node.id}
        data-pb-type="image"
        className={blockClass(node, 'pb-image')}
        src={src}
        alt={str(props.alt)}
        style={{ ...ratioStyle(props.ratio), borderRadius: props.rounded === false ? 0 : undefined }}
        loading={ctx.mode === 'published' ? 'lazy' : 'eager'}
      />
    );
  },
};

const video: BlockDefinition = {
  type: 'video',
  title: 'Видео',
  category: 'media',
  icon: Play,
  defaultProps: { src: '', ratio: '16/9' },
  controls: [
    { kind: 'text', key: 'src', label: 'Ссылка (YouTube / Vimeo / mp4)' },
    { kind: 'select', key: 'ratio', label: 'Пропорции', options: RATIOS.map((value) => ({ label: value, value })) },
  ],
  render: ({ node, props }) => {
    const src = str(props.src);
    const embedUrl = youtubeEmbed(src);
    if (!embedUrl && !src) {
      return (
        <div
          data-pb-id={node.id}
          data-pb-type="video"
          className={blockClass(node, '')}
          style={{ ...ratioStyle(props.ratio), display: 'grid', placeItems: 'center', background: 'var(--pb-surface)', border: '1px dashed var(--pb-border)', borderRadius: 'var(--pb-radius)', color: 'var(--pb-muted)' }}
        >
          <span style={{ fontSize: 13 }}>Вставьте ссылку на видео</span>
        </div>
      );
    }
    return (
      <div data-pb-id={node.id} data-pb-type="video" className={blockClass(node, 'pb-video-frame')} style={{ ...ratioStyle(props.ratio) }}>
        {embedUrl ? (
          <iframe src={embedUrl} title="Video" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" allow="autoplay; encrypted-media; picture-in-picture" />
        ) : (
          <video src={src} controls style={{ width: '100%', display: 'block' }} />
        )}
      </div>
    );
  },
};

const embed: BlockDefinition = {
  type: 'embed',
  title: 'HTML-код',
  category: 'media',
  icon: Square,
  description: 'Только для платных тарифов (custom code)',
  defaultProps: { html: '<div style="padding:24px;text-align:center">Custom HTML</div>', height: 240 },
  controls: [
    { kind: 'textarea', key: 'html', label: 'HTML', rows: 8 },
    { kind: 'number', key: 'height', label: 'Высота, px', min: 80, max: 900 },
  ],
  render: ({ node, props, ctx }) =>
    ctx.mode === 'editor' ? (
      <div
        data-pb-id={node.id}
        data-pb-type="embed"
        className={blockClass(node, '')}
        style={{ padding: 16, background: 'var(--pb-surface)', border: '1px dashed var(--pb-border)', borderRadius: 'var(--pb-radius)', fontSize: 12, color: 'var(--pb-muted)' }}
      >
        Custom HTML · {str(props.html).slice(0, 120)}
      </div>
    ) : (
      <iframe
        data-pb-id={node.id}
        data-pb-type="embed"
        className={blockClass(node, '')}
        title="Embedded content"
        srcDoc={str(props.html)}
        sandbox="allow-scripts allow-forms allow-popups"
        style={{ width: '100%', height: `${num(props.height, 240)}px`, border: 0, borderRadius: 'var(--pb-radius)' }}
      />
    ),
};

/* ══════════════════════════════════════════════════════════
 *  Marketing
 * ══════════════════════════════════════════════════════════ */

const nav: BlockDefinition = {
  type: 'nav',
  title: 'Навигация',
  category: 'marketing',
  icon: AlignLeft,
  defaultProps: {
    brand: 'Brand',
    links: 'Home|/\nAbout|/about\nContact|/contact',
    ctaLabel: 'Start',
    ctaHref: '#',
  },
  controls: [
    { kind: 'text', key: 'brand', label: 'Логотип / название' },
    { kind: 'links', key: 'links', label: 'Ссылки (Label|/path)' },
    { kind: 'text', key: 'ctaLabel', label: 'Текст кнопки' },
    { kind: 'url', key: 'ctaHref', label: 'Ссылка кнопки' },
  ],
  render: ({ node, props, ctx }) => {
    const links = parseLinks(props.links);
    return (
      <nav data-pb-id={node.id} data-pb-type="nav" className={blockClass(node, 'pb-nav')}>
        <a className="pb-nav-brand" href="/" onClick={ctx.mode === 'editor' ? (event) => event.preventDefault() : undefined}>
          {str(props.brand, 'Brand')}
        </a>
        <div className="pb-nav-links">
          {links.map((link, index) => (
            <a key={`${link.label}-${index}`} href={link.href} onClick={ctx.mode === 'editor' ? (event) => event.preventDefault() : undefined}>
              {link.label}
            </a>
          ))}
        </div>
        {str(props.ctaLabel) && (
          <a
            className="pb-btn pb-btn-primary pb-btn-sm"
            href={str(props.ctaHref, '#')}
            onClick={ctx.mode === 'editor' ? (event) => event.preventDefault() : undefined}
          >
            {str(props.ctaLabel)}
          </a>
        )}
      </nav>
    );
  },
};

const form: BlockDefinition = {
  type: 'form',
  title: 'Форма',
  category: 'marketing',
  icon: MessageSquare,
  defaultProps: {
    fields: 'Email|Email\nMessage|Message',
    submitLabel: 'Отправить',
    action: '',
  },
  controls: [
    { kind: 'fields', key: 'fields', label: 'Поля (name|Label)' },
    { kind: 'text', key: 'submitLabel', label: 'Текст кнопки' },
    { kind: 'url', key: 'action', label: 'Endpoint формы (Formspree и т.п.)' },
  ],
  render: ({ node, props }) => {
    const fields = parseFields(props.fields);
    return (
      <form data-pb-id={node.id} data-pb-type="form" className={blockClass(node, 'pb-form')} action={str(props.action) || undefined} method="post">
        {fields.map((field) => (
          <div className="pb-form-row" key={field.name}>
            <label className="pb-form-label">{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea className="pb-input" name={field.name} rows={4} />
            ) : (
              <input className="pb-input" name={field.name} type={field.type} />
            )}
          </div>
        ))}
        <div>
          <button type="submit" className="pb-btn pb-btn-primary">
            {str(props.submitLabel, 'Отправить')}
          </button>
        </div>
      </form>
    );
  },
};

export const DEFINITIONS: BlockDefinition[] = [
  section,
  container,
  columns,
  grid,
  heading,
  text,
  button,
  badge,
  divider,
  spacer,
  iconBlock,
  stat,
  image,
  video,
  embed,
  nav,
  form,
];

export function youtubeEmbed(url: string): string | null {
  if (!url) return null;
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export const PALETTE_ICONS = { CreditCard, Layers, ImageIcon, Heading };

