import { createId, DEFAULT_THEME, type PageDocument, type PageNode, type StyleProps, type Theme } from '@yazi/page-schema';
import { generatedTemplates } from './generate';

export type TemplateCategory = 'restaurant' | 'consulting' | 'agency' | 'shop' | 'personal' | 'saas' | 'other';

export type TemplateSeed = {
  name: string;
  slug: string;
  category: TemplateCategory;
  description: string;
  thumbnailUrl: string | null;
  document: PageDocument;
};

/* ── tiny builder DSL ──────────────────────────────────────── */

function node(type: string, props: Record<string, unknown> = {}, style: StyleProps = {}, children?: PageNode[]): PageNode {
  return { id: createId(type.slice(0, 3)), type, props, style, ...(children ? { children } : {}) };
}

const section = (props: Record<string, unknown>, style: StyleProps, children: PageNode[]) =>
  node('section', { container: true, tag: 'section', ...props }, style, children);

const heading = (text: string, level = 2, style: StyleProps = {}) =>
  node('heading', { text, level, align: 'left' }, style);

const text = (value: string, opts: { size?: 'sm' | 'md' | 'lg'; align?: 'left' | 'center'; muted?: boolean } = {}, style: StyleProps = {}) =>
  node('text', { text: value, size: opts.size ?? 'md', align: opts.align ?? 'left', muted: opts.muted ?? false }, style);

const button = (label: string, href = '#', variant: 'primary' | 'secondary' | 'ghost' = 'primary', align: 'left' | 'center' = 'left') =>
  node('button', { label, href, variant, align });

const image = (src: string, alt: string, ratio = '16/9', style: StyleProps = {}) =>
  node('image', { src, alt, ratio, fit: 'cover', rounded: true }, style);

const cols = (children: PageNode[], ratios?: number[], style: StyleProps = {}) =>
  node('columns', ratios ? { ratios } : {}, { gap: { base: 24 }, ...style }, children);

const grid = (childrenList: PageNode[], colsCount = 3, style: StyleProps = {}) =>
  node('grid', { cols: colsCount }, { gap: { base: 20 }, ...style }, childrenList);

const card = (children: PageNode[], style: StyleProps = {}) =>
  node('container', { card: true }, { padding: { base: [28, 24, 28, 24] }, radius: { base: 16 }, ...style }, children);

const badge = (value: string) => node('badge', { text: value });
const divider = () => node('divider', {});
const spacer = (size = 32) => node('spacer', { size }, { minHeight: { base: size } });

const nav = (brand: string, links: { label: string; href: string }[], cta?: { label: string; href: string }) =>
  node('nav', {
    brand,
    links: links.map((link) => `${link.label}|${link.href}`).join('\n'),
    ctaLabel: cta?.label,
    ctaHref: cta?.href,
  });

const icon = (name: string, color?: string) => node('icon', { name, size: 22 }, color ? { color: { base: color } } : {});

const stat = (value: string, label: string) => node('stat', { value, label });

const feature = (title: string, body: string, iconName = 'check') =>
  card([icon(iconName), heading(title, 3, { fontSize: { base: 20 } }), text(body, { muted: true })], { background: { base: '#FFFFFF' } });

/* ── theme helper ──────────────────────────────────────────── */

function makeTheme(patch: {
  primary: string;
  background?: string;
  surface?: string;
  text?: string;
  muted?: string;
  border?: string;
  primaryContrast?: string;
  heading?: string;
  body?: string;
  radius?: number;
  containerWidth?: number;
}): Theme {
  return {
    ...DEFAULT_THEME,
    colors: {
      ...DEFAULT_THEME.colors,
      primary: patch.primary,
      background: patch.background ?? '#FFFFFF',
      surface: patch.surface ?? '#F6F8FC',
      text: patch.text ?? '#0F172A',
      muted: patch.muted ?? '#64748B',
      border: patch.border ?? '#E2E8F0',
      primaryContrast: patch.primaryContrast ?? '#FFFFFF',
    },
    fonts: { heading: patch.heading ?? 'Inter', body: patch.body ?? 'Inter' },
    radius: patch.radius ?? 12,
    containerWidth: patch.containerWidth ?? 1120,
  };
}

/* ── shared section recipes ────────────────────────────────── */

const footer = (brand: string, note: string) =>
  section(
    { tag: 'footer' },
    { padding: { base: [40, 24, 40, 24] }, background: { base: '#0F1419' }, color: { base: '#94A3B8' } },
    [cols([text(`© ${new Date().getFullYear()} ${brand}`, { size: 'sm' }), text(note, { size: 'sm', align: 'center' })], [1, 1])],
  );

const ctaSection = (title: string, body: string, ctaLabel: string, href = '#') =>
  section(
    { container: true },
    { padding: { base: [80, 24, 80, 24], mobile: [56, 20, 56, 20] }, background: { base: '#111827' }, color: { base: '#FFFFFF' } },
    [heading(title, 2, { fontSize: { base: 40, mobile: 28 }, textAlign: { base: 'center' }, maxWidth: { base: 720 } }), text(body, { align: 'center', size: 'lg' }), button(ctaLabel, href, 'primary', 'center')],
  );

/* ════════════════════════════════════════════════════════════
 *  1. Restaurant
 * ════════════════════════════════════════════════════════════ */

const restaurant: TemplateSeed = {
  name: 'Bistro Nord',
  slug: 'bistro-nord',
  category: 'restaurant',
  description: 'Warm restaurant landing page with menu grid, story section and table booking CTA.',
  thumbnailUrl: '/tpl/template-restaurant.svg',
  document: {
    schemaVersion: 1,
    theme: makeTheme({ primary: '#B4552D', background: '#FFFDF9', surface: '#F5EDE4', text: '#221C18', muted: '#7A6A5F', border: '#E8DCD0', heading: 'Playfair Display', body: 'Lora', radius: 6 }),
    sections: [
      section(
        { tag: 'header' },
        { padding: { base: [18, 24, 18, 24], mobile: [14, 16, 14, 16] }, background: { base: '#FFFDF9' } },
        [nav('Bistro Nord', [{ label: 'Home', href: '/' }, { label: 'Menu', href: '/menu' }, { label: 'Story', href: '/story' }, { label: 'Contact', href: '/contact' }], { label: 'Book a table', href: '#book' })],
      ),
      section(
        { container: true },
        { padding: { base: [96, 24, 80, 24], mobile: [56, 16, 48, 16] }, background: { base: '#221C18' }, color: { base: '#FDEEE2' } },
        [
          badge('Nordic kitchen · Oslo'),
          heading('Seasonal plates, slow evenings.', 1, { fontSize: { base: 64, mobile: 36 }, lineHeight: { base: 1.05 }, maxWidth: { base: 640 } }),
          text('A short menu that changes with the market. Wood fire, local farms, natural wine.', { size: 'lg', muted: false }, { maxWidth: { base: 520 } }),
          cols([button('Book a table', '#book'), button('See the menu', '#menu', 'secondary')], [1, 1], { maxWidth: { base: 380 } }),
        ],
      ),
      section({ container: true }, { padding: { base: [0, 24, 0, 24] } }, [image('/tpl/restaurant-table.svg', 'Dining room', '16/8')]),
      section(
        { container: true },
        { padding: { base: [88, 24, 88, 24], mobile: [56, 16, 56, 16] }, background: { base: '#F5EDE4' } },
        [
          heading('This week on the menu', 2, { fontSize: { base: 40, mobile: 28 } }),
          text('Three courses, one seating. Ask the team about pairings.', { muted: true }),
          grid(
            [
              card([heading('Charred leek', 3, { fontSize: { base: 22 } }), text('Hazelnut cream, brown butter, rye crumb.', { muted: true }), text('190 NOK', { size: 'sm' })]),
              card([heading('Halibut', 3, { fontSize: { base: 22 } }), text('Cider glaze, fennel, sea herbs.', { muted: true }), text('280 NOK', { size: 'sm' })]),
              card([heading('Rhubarb', 3, { fontSize: { base: 22 } }), text('Buttermilk, toasted oats, vanilla.', { muted: true }), text('150 NOK', { size: 'sm' })]),
            ],
            3,
          ),
        ],
      ),
      section(
        { container: true },
        { padding: { base: [88, 24, 88, 24], mobile: [56, 16, 56, 16] } },
        [
          cols(
            [
              image('/tpl/chef.svg', 'Chef at work', '1/1'),
              node('container', {}, {}, [
                badge('Our story'),
                heading('A kitchen with a short memory.', 2, { fontSize: { base: 38, mobile: 26 } }),
                text('We cook what the week gives us. The menu is written on Monday and rarely survives past Sunday.', { size: 'lg', muted: true }),
                text('Twenty seats, one seating, no rush.', { muted: true }),
                button('Read our story', '/story', 'ghost'),
              ]),
            ],
            [1, 1],
            { gap: { base: 48 } },
          ),
        ],
      ),
      section(
        { tag: 'section' },
        { padding: { base: [88, 24, 88, 24], mobile: [56, 16, 56, 16] }, background: { base: '#221C18' }, color: { base: '#FDEEE2' } },
        [
          heading('Reserve your evening', 2, { fontSize: { base: 40, mobile: 28 }, textAlign: { base: 'center' }, maxWidth: { base: 700 } }),
          text('Tuesday to Saturday, 18:00 and 20:30 seatings.', { align: 'center', muted: true }),
          button('Book a table', 'mailto:hello@bistronord.no', 'primary', 'center'),
        ],
      ),
      footer('Bistro Nord', 'Thorvald Meyers gate 12, Oslo'),
    ],
  },
};

/* ════════════════════════════════════════════════════════════
 *  2. Consulting
 * ════════════════════════════════════════════════════════════ */

const consulting: TemplateSeed = {
  name: 'Meridian Consulting',
  slug: 'meridian-consulting',
  category: 'consulting',
  description: 'Corporate consulting layout with split hero, stats, services and a strong contact CTA.',
  thumbnailUrl: '/tpl/template-consulting.svg',
  document: {
    schemaVersion: 1,
    theme: makeTheme({ primary: '#2F5BEA', surface: '#F1F5FF', border: '#DCE5FF', heading: 'Manrope', body: 'Inter' }),
    sections: [
      section(
        { tag: 'header' },
        { padding: { base: [18, 24, 18, 24], mobile: [14, 16, 14, 16] }, background: { base: '#FFFFFF' }, borderColor: { base: '#EEF1F6' }, borderWidth: { base: 1 } },
        [nav('Meridian', [{ label: 'Home', href: '/' }, { label: 'Services', href: '#services' }, { label: 'About', href: '#about' }, { label: 'Contact', href: '#contact' }], { label: 'Talk to us', href: '#contact' })],
      ),
      section(
        { container: true },
        { padding: { base: [72, 24, 72, 24], mobile: [40, 16, 40, 16] }, background: { base: '#F7F9FF' } },
        [
          cols(
            [
              node('container', {}, {}, [
                badge('Strategy · Operations · Growth'),
                heading('Empowering your business with clarity.', 1, { fontSize: { base: 56, mobile: 34 }, lineHeight: { base: 1.05 }, maxWidth: { base: 560 } }),
                text('We help mid-market teams find the one lever that moves revenue, then we stay until it works.', { size: 'lg', muted: true }, { maxWidth: { base: 460 } }),
                cols([button('Book a diagnostic', '#contact'), button('See services', '#services', 'secondary')], [1, 1], { maxWidth: { base: 400 } }),
              ]),
              image('/tpl/hero-consulting.svg', 'Workshop', '4/5'),
            ],
            [1, 1],
            { gap: { base: 56 } },
          ),
        ],
      ),
      section(
        { container: true },
        { padding: { base: [56, 24, 56, 24] }, background: { base: '#FFFFFF' }, borderColor: { base: '#EEF1F6' }, borderWidth: { base: 1 } },
        [grid([stat('6+', 'Years in the field'), stat('45+', 'Companies helped'), stat('80+', 'Satisfied clients'), stat('12', 'Industries')], 4)],
      ),
      section(
        { container: true },
        { padding: { base: [88, 24, 88, 24], mobile: [56, 16, 56, 16] }, background: { base: '#F1F5FF' } },
        [
          badge('Services'),
          heading('Where we are useful', 2, { fontSize: { base: 40, mobile: 28 } }),
          text('Focused engagements, senior people, measurable outcomes.', { muted: true }),
          grid([feature('Go-to-market', 'Positioning, pricing and the first 90 days of a launch.', 'bolt'), feature('Operating model', 'Clear ownership, fewer meetings, faster decisions.', 'shield'), feature('Data & reporting', 'A dashboard your team actually opens on Monday.', 'check')], 3),
        ],
      ),
      section(
        { container: true },
        { padding: { base: [88, 24, 88, 24], mobile: [56, 16, 56, 16] } },
        [
          cols(
            [
              node('container', {}, {}, [
                heading('Why teams call us', 2, { fontSize: { base: 38, mobile: 26 } }),
                text('“They cut our reporting cycle from three weeks to four days and left the team able to keep it that way.”', { size: 'lg' }, { maxWidth: { base: 520 } }),
                text('Head of Operations, Nordic Retail Group', { size: 'sm', muted: true }),
              ]),
              image('/tpl/team.svg', 'Team meeting', '1/1'),
            ],
            [3, 2],
            { gap: { base: 48 } },
          ),
        ],
      ),
      section(
        { tag: 'section', container: true },
        { padding: { base: [80, 24, 80, 24], mobile: [56, 16, 56, 16] }, background: { base: '#0B1B4A' }, color: { base: '#FFFFFF' } },
        [
          heading('Start with a 45-minute diagnostic.', 2, { fontSize: { base: 40, mobile: 28 }, textAlign: { base: 'center' }, maxWidth: { base: 720 } }),
          text('No deck, no pitch. We ask questions and tell you if we can help.', { align: 'center', muted: true }),
          button('Schedule a call', '#contact', 'secondary', 'center'),
        ],
      ),
      footer('Meridian', 'Bergen · Oslo · Stockholm'),
    ],
  },
};

/* ════════════════════════════════════════════════════════════
 *  3. Agency (dark)
 * ════════════════════════════════════════════════════════════ */

const agency: TemplateSeed = {
  name: 'Studio Kite',
  slug: 'studio-kite',
  category: 'agency',
  description: 'Bold dark portfolio layout for a design studio: oversized type, selected work grid.',
  thumbnailUrl: '/tpl/template-agency.svg',
  document: {
    schemaVersion: 1,
    theme: makeTheme({ primary: '#D5FF4F', primaryContrast: '#0B0F0C', background: '#0B0F0C', surface: '#131A15', text: '#F4F7F4', muted: '#93A39A', border: '#22302A', heading: 'Space Grotesk', body: 'DM Sans', radius: 18 }),
    sections: [
      section(
        { tag: 'header' },
        { padding: { base: [20, 24, 20, 24] }, background: { base: '#0B0F0C' } },
        [nav('Studio Kite', [{ label: 'Work', href: '#work' }, { label: 'Studio', href: '#studio' }, { label: 'Contact', href: '#contact' }], { label: 'Start a project', href: '#contact' })],
      ),
      section(
        { container: true },
        { padding: { base: [80, 24, 64, 24], mobile: [48, 16, 40, 16] } },
        [
          badge('Design & build studio · Berlin'),
          heading('We design products people keep using.', 1, { fontSize: { base: 76, mobile: 38 }, lineHeight: { base: 0.98 }, maxWidth: { base: 900 } }),
          cols([text('Interfaces, identities and the systems behind them. Small team, senior hands.', { size: 'lg', muted: true }, { maxWidth: { base: 520 } }), button('See selected work', '#work')], [2, 1]),
        ],
      ),
      section({ container: true }, { padding: { base: [0, 24, 32, 24] } }, [image('/tpl/agency-hero.svg', 'Studio work', '21/9')]),
      section(
        { container: true },
        { padding: { base: [64, 24, 64, 24], mobile: [40, 16, 40, 16] }, background: { base: '#131A15' } },
        [
          heading('Selected work', 2, { fontSize: { base: 40, mobile: 28 } }),
          grid(
            [
              card([image('/tpl/work-1.svg', 'Project one', '3/2'), heading('Northwind', 3, { fontSize: { base: 22 } }), text('Brand & product design', { size: 'sm', muted: true })], { background: { base: '#0B0F0C' } }),
              card([image('/tpl/work-2.svg', 'Project two', '3/2'), heading('Halden Bank', 3, { fontSize: { base: 22 } }), text('Design system', { size: 'sm', muted: true })], { background: { base: '#0B0F0C' } }),
              card([image('/tpl/work-3.svg', 'Project three', '3/2'), heading('Fjord Mobility', 3, { fontSize: { base: 22 } }), text('Mobile app', { size: 'sm', muted: true })], { background: { base: '#0B0F0C' } }),
            ],
            3,
          ),
        ],
      ),
      section(
        { container: true },
        { padding: { base: [72, 24, 72, 24], mobile: [48, 16, 48, 16] } },
        [
          heading('How we work', 2, { fontSize: { base: 38, mobile: 26 } }),
          grid([feature('Week 1', 'Audit, interviews, a plan you can argue with.', 'clock'), feature('Week 2–4', 'Design in the open, two reviews a week.', 'bolt'), feature('Week 5+', 'Build, ship, hand over documentation.', 'shield')], 3),
        ],
      ),
      ctaSection('Got something worth building?', 'Tell us about the problem, not the solution.', 'hello@studiokite.de', 'mailto:hello@studiokite.de'),
      footer('Studio Kite', 'Kreuzberg, Berlin'),
    ],
  },
};

/* ════════════════════════════════════════════════════════════
 *  4. Flower shop / shop
 * ════════════════════════════════════════════════════════════ */

const flowerShop: TemplateSeed = {
  name: 'Bloom Flower Shop',
  slug: 'bloom-flower-shop',
  category: 'shop',
  description: 'Soft editorial shop layout with product grid and a calm ordering flow.',
  thumbnailUrl: '/tpl/template-shop.svg',
  document: {
    schemaVersion: 1,
    theme: makeTheme({ primary: '#2F3E46', background: '#FBF9F6', surface: '#F1EDE7', text: '#22272B', muted: '#7C858B', border: '#E5DFD7', heading: 'Playfair Display', body: 'DM Sans', radius: 4 }),
    sections: [
      section(
        { tag: 'header' },
        { padding: { base: [18, 24, 18, 24] }, background: { base: '#FBF9F6' }, borderColor: { base: '#EDE8E1' }, borderWidth: { base: 1 } },
        [nav('Bloom', [{ label: 'Home', href: '/' }, { label: 'Bouquets', href: '#shop' }, { label: 'Workshops', href: '#workshops' }, { label: 'Contact', href: '#contact' }], { label: 'Order now', href: '#shop' })],
      ),
      section(
        { container: true },
        { padding: { base: [64, 24, 64, 24], mobile: [40, 16, 40, 16] } },
        [
          cols(
            [
              node('container', {}, {}, [
                badge('Fresh from the market'),
                heading('Send love with flowers.', 1, { fontSize: { base: 64, mobile: 36 }, lineHeight: { base: 1.02 }, maxWidth: { base: 480 } }),
                text('Hand-tied bouquets, delivered across the city before noon.', { size: 'lg', muted: true }, { maxWidth: { base: 400 } }),
                button('Explore the collection', '#shop'),
              ]),
              image('/tpl/bouquet.svg', 'Bouquet', '4/5'),
            ],
            [1, 1],
            { gap: { base: 48 } },
          ),
        ],
      ),
      section(
        { container: true },
        { padding: { base: [72, 24, 72, 24], mobile: [48, 16, 48, 16] }, background: { base: '#F1EDE7' } },
        [
          heading('This week', 2, { fontSize: { base: 38, mobile: 26 } }),
          grid(
            [
              card([image('/tpl/product-1.svg', 'Peony bunch', '8/7'), heading('Peony bunch', 3, { fontSize: { base: 20 } }), text('€39 · seasonal', { size: 'sm', muted: true })]),
              card([image('/tpl/product-2.svg', 'Wild stems', '8/7'), heading('Wild stems', 3, { fontSize: { base: 20 } }), text('€29 · seasonal', { size: 'sm', muted: true })]),
              card([image('/tpl/product-3.svg', 'Dried arrangement', '8/7'), heading('Dried arrangement', 3, { fontSize: { base: 20 } }), text('€45 · lasts months', { size: 'sm', muted: true })]),
            ],
            3,
          ),
          button('See all bouquets', '#shop', 'ghost'),
        ],
      ),
      section(
        { container: true },
        { padding: { base: [72, 24, 72, 24], mobile: [48, 16, 48, 16] } },
        [
          cols(
            [
              image('/tpl/workshop.svg', 'Workshop', '9/7'),
              node('container', {}, {}, [
                heading('Saturday workshops', 2, { fontSize: { base: 34, mobile: 24 } }),
                text('Two hours, all materials, a bouquet to take home. Six seats per session.', { muted: true }, { maxWidth: { base: 420 } }),
                text('Next session: 12 April, 11:00', { size: 'sm' }),
                button('Reserve a seat', '#workshops', 'secondary'),
              ]),
            ],
            [1, 1],
            { gap: { base: 40 } },
          ),
        ],
      ),
      section(
        { tag: 'section', container: true },
        { padding: { base: [64, 24, 64, 24], mobile: [48, 16, 48, 16] }, background: { base: '#2F3E46' }, color: { base: '#F6F3EE' } },
        [heading('Same-day delivery before 14:00', 2, { fontSize: { base: 34, mobile: 24 } }), text('Order by phone or online. We write the card by hand.', { muted: true }), button('Order now', '#shop', 'secondary')],
      ),
      footer('Bloom', 'Markveien 24, Oslo'),
    ],
  },
};

/* ════════════════════════════════════════════════════════════
 *  5. Personal specialist
 * ════════════════════════════════════════════════════════════ */

const personal: TemplateSeed = {
  name: 'Dr. Larsen',
  slug: 'dr-larsen',
  category: 'personal',
  description: 'Calm personal practice page with portrait, services and appointment form.',
  thumbnailUrl: '/tpl/template-personal.svg',
  document: {
    schemaVersion: 1,
    theme: makeTheme({ primary: '#1F6F5C', background: '#FCFDFC', surface: '#EFF5F2', text: '#17211E', muted: '#62736D', border: '#DDE8E3', heading: 'Lora', body: 'Fira Sans', radius: 10 }),
    sections: [
      section(
        { tag: 'header' },
        { padding: { base: [18, 24, 18, 24] }, background: { base: '#FCFDFC' } },
        [nav('Dr. Ingrid Larsen', [{ label: 'Approach', href: '#approach' }, { label: 'Sessions', href: '#sessions' }, { label: 'Contact', href: '#contact' }], { label: 'Book a session', href: '#contact' })],
      ),
      section(
        { container: true },
        { padding: { base: [64, 24, 64, 24], mobile: [40, 16, 40, 16] } },
        [
          cols(
            [
              node('container', {}, {}, [
                badge('Clinical psychologist · Oslo'),
                heading('A calm place to think out loud.', 1, { fontSize: { base: 52, mobile: 32 }, lineHeight: { base: 1.06 }, maxWidth: { base: 520 } }),
                text('Individual therapy for adults dealing with stress, transitions and long-running worry.', { size: 'lg', muted: true }, { maxWidth: { base: 440 } }),
                cols([button('Book a first session', '#contact'), button('How it works', '#approach', 'secondary')], [1, 1], { maxWidth: { base: 420 } }),
              ]),
              image('/tpl/portrait.svg', 'Dr. Ingrid Larsen', '4/5'),
            ],
            [1, 1],
            { gap: { base: 56 } },
          ),
        ],
      ),
      section(
        { container: true },
        { padding: { base: [64, 24, 64, 24], mobile: [48, 16, 48, 16] }, background: { base: '#EFF5F2' } },
        [
          heading('How it works', 2, { fontSize: { base: 36, mobile: 26 } }),
          grid([feature('First conversation', 'Fifty minutes to map what is going on.', 'clock'), feature('Weekly sessions', 'Same time each week, in person or online.', 'check'), feature('Review', 'Every eight weeks we look at progress together.', 'shield')], 3),
        ],
      ),
      section(
        { container: true },
        { padding: { base: [64, 24, 64, 24], mobile: [48, 16, 48, 16] } },
        [
          badge('Sessions'),
          heading('Practical details', 2, { fontSize: { base: 36, mobile: 26 } }),
          grid([card([heading('Individual', 3, { fontSize: { base: 22 } }), text('50 minutes · 1 200 NOK', { muted: true }), text('Weekly or bi-weekly.'), button('Book', '#contact', 'ghost')]), card([heading('Online', 3, { fontSize: { base: 22 } }), text('50 minutes · 1 000 NOK', { muted: true }), text('Secure video, same structure.'), button('Book', '#contact', 'ghost')])], 2),
        ],
      ),
      section(
        { tag: 'section', container: true },
        { padding: { base: [72, 24, 72, 24], mobile: [48, 16, 48, 16] }, background: { base: '#1F6F5C' }, color: { base: '#F2F8F5' } },
        [heading('Not sure where to start?', 2, { fontSize: { base: 34, mobile: 24 }, textAlign: { base: 'center' } }), text('Send a short message. I answer within two working days.', { align: 'center', muted: true }), button('Write to me', 'mailto:post@larsen.no', 'secondary', 'center')],
      ),
      footer('Dr. Ingrid Larsen', 'Bygdøy allé 8, Oslo'),
    ],
  },
};

/* ════════════════════════════════════════════════════════════
 *  6. SaaS
 * ════════════════════════════════════════════════════════════ */

const saas: TemplateSeed = {
  name: 'Flowbase',
  slug: 'flowbase',
  category: 'saas',
  description: 'Product landing page: headline, feature grid, metrics and a trial CTA.',
  thumbnailUrl: '/tpl/template-saas.svg',
  document: {
    schemaVersion: 1,
    theme: makeTheme({ primary: '#6D4AFF', surface: '#F4F1FF', border: '#E4DDFF', heading: 'Manrope', body: 'Inter', radius: 14 }),
    sections: [
      section(
        { tag: 'header' },
        { padding: { base: [18, 24, 18, 24] }, background: { base: '#FFFFFF' } },
        [nav('Flowbase', [{ label: 'Product', href: '#product' }, { label: 'Pricing', href: '#pricing' }, { label: 'Docs', href: '#docs' }], { label: 'Start free', href: '#pricing' })],
      ),
      section(
        { container: true },
        { padding: { base: [80, 24, 64, 24], mobile: [48, 16, 40, 16] }, background: { base: '#F4F1FF' } },
        [
          badge('New · Realtime boards'),
          heading('Ship the work, not the status updates.', 1, { fontSize: { base: 60, mobile: 34 }, lineHeight: { base: 1.04 }, textAlign: { base: 'center' }, maxWidth: { base: 820 } }),
          text('Flowbase turns your team’s work into one living board — no weekly sync required.', { size: 'lg', align: 'center', muted: true }, { maxWidth: { base: 560 } }),
          button('Start free · no card', '#pricing', 'primary', 'center'),
          image('/tpl/ui.svg', 'Product screenshot', '16/9', { margin: { base: 16 } }),
        ],
      ),
      section(
        { container: true },
        { padding: { base: [72, 24, 72, 24], mobile: [48, 16, 48, 16] } },
        [
          heading('Built for the way teams actually work', 2, { fontSize: { base: 38, mobile: 26 }, textAlign: { base: 'center' } }),
          grid([feature('Realtime boards', 'Changes appear instantly for everyone online.', 'bolt'), feature('Async standups', 'Written updates that replace a meeting.', 'clock'), feature('Automations', 'Move, assign and remind without a script.', 'shield'), feature('Insights', 'See where work waits, not just what shipped.', 'check'), feature('Integrations', 'GitHub, Slack, Linear, Figma.', 'check'), feature('Permissions', 'Granular roles per board and per team.', 'shield')], 3),
        ],
      ),
      section(
        { container: true },
        { padding: { base: [64, 24, 64, 24], mobile: [48, 16, 48, 16] }, background: { base: '#111827' }, color: { base: '#FFFFFF' } },
        [grid([stat('14k', 'Teams onboard'), stat('2.1M', 'Cards shipped'), stat('99.99%', 'Uptime'), stat('38%', 'Fewer meetings')], 4)],
      ),
      ctaSection('Try Flowbase with your real team.', 'Free for up to five people, forever.', 'Start free', '#pricing'),
      footer('Flowbase', 'Made in Oslo'),
    ],
  },
};

export const systemTemplates: TemplateSeed[] = [consulting, restaurant, agency, flowerShop, personal, saas, ...generatedTemplates];

export { generatedTemplates } from './generate';

export function findSystemTemplate(slug: string): TemplateSeed | undefined {
  return systemTemplates.find((t) => t.slug === slug);
}
