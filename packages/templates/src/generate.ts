import { createId, DEFAULT_THEME, type PageDocument, type PageNode, type StyleProps, type Theme } from '@yazi/page-schema';

/* ── builders ───────────────────────────────────────────── */

function node(type: string, props: Record<string, unknown> = {}, style: StyleProps = {}, children?: PageNode[]): PageNode {
  return { id: createId(type.slice(0, 3)), type, props, style, ...(children ? { children } : {}) };
}

const section = (props: Record<string, unknown>, style: StyleProps, children: PageNode[]) =>
  node('section', { container: true, tag: 'section', ...props }, style, children);

const heading = (text: string, level = 2, style: StyleProps = {}) => node('heading', { text, level, align: 'left' }, style);
const text = (value: string, opts: { size?: 'sm' | 'md' | 'lg'; align?: 'left' | 'center'; muted?: boolean } = {}, style: StyleProps = {}) =>
  node('text', { text: value, size: opts.size ?? 'md', align: opts.align ?? 'left', muted: opts.muted ?? false }, style);
const button = (label: string, href = '#', variant: 'primary' | 'secondary' | 'ghost' = 'primary', align: 'left' | 'center' = 'left') =>
  node('button', { label, href, variant, align });
const image = (src: string, alt: string, ratio = '16/9', style: StyleProps = {}) =>
  node('image', { src, alt, ratio, fit: 'cover', rounded: true }, style);
const cols = (children: PageNode[], style: StyleProps = {}) => node('columns', {}, { gap: { base: 40 }, ...style }, children);
const grid = (children: PageNode[], count = 3, style: StyleProps = {}) => node('grid', { cols: count }, { gap: { base: 20 }, ...style }, children);
const card = (children: PageNode[], style: StyleProps = {}) =>
  node('container', { card: true }, { padding: { base: [26, 22, 26, 22] }, radius: { base: 14 }, ...style }, children);
const badge = (value: string) => node('badge', { text: value });
const nav = (brand: string, links: { label: string; href: string }[], cta?: string) =>
  node('nav', { brand, links: links.map((l) => `${l.label}|${l.href}`).join('\n'), ctaLabel: cta, ctaHref: '#' });
const stat = (value: string, label: string) => node('stat', { value, label });
const footer = (brand: string, note: string) =>
  section(
    { tag: 'footer' },
    { padding: { base: [36, 24, 36, 24] }, background: { base: '#0F1419' }, color: { base: '#94A3B8' } },
    [cols([text(`© ${new Date().getFullYear()} ${brand}`, { size: 'sm' }), text(note, { size: 'sm', align: 'center' })])],
  );

function theme(p: Preset): Theme {
  return {
    ...DEFAULT_THEME,
    colors: {
      primary: p.primary,
      primaryContrast: p.primaryContrast ?? '#FFFFFF',
      text: p.text ?? '#0F172A',
      muted: p.muted ?? '#64748B',
      background: p.background ?? '#FFFFFF',
      surface: p.surface ?? '#F6F8FC',
      border: p.border ?? '#E2E8F0',
    },
    fonts: { heading: p.heading ?? 'Inter', body: p.body ?? 'Inter' },
    radius: p.radius ?? 12,
    containerWidth: p.containerWidth ?? 1120,
  };
}

/* ── presets ────────────────────────────────────────────── */

type Offering = { title: string; text: string; price?: string };

type Preset = {
  slug: string;
  name: string;
  category: 'restaurant' | 'consulting' | 'agency' | 'shop' | 'personal' | 'saas' | 'other';
  description: string;
  primary: string;
  primaryContrast?: string;
  background?: string;
  surface?: string;
  text?: string;
  muted?: string;
  border?: string;
  heading?: string;
  body?: string;
  radius?: number;
  containerWidth?: number;
  brand: string;
  badge: string;
  headline: string;
  sub: string;
  cta: string;
  secondary?: string;
  links: { label: string; href: string }[];
  offerings: Offering[];
  offeringsTitle: string;
  stats: { value: string; label: string }[];
  storyTitle: string;
  story: string[];
  quote: string;
  quoteBy: string;
  ctaTitle: string;
  ctaText: string;
  ctaLabel: string;
  footerNote: string;
  hero: string;
  photo: string;
  gallery: [string, string, string];
};

const P = (preset: Preset) => preset;

export const presets: Preset[] = [
  P({
    slug: 'forno-nero', name: 'Forno Nero', category: 'restaurant',
    description: 'Pizzeria with a wood-fired oven: menu cards, gallery and booking.',
    primary: '#C2410C', background: '#FFFBF5', surface: '#FBEDE2', border: '#F0DCCB', heading: 'Playfair Display', body: 'DM Sans',
    brand: 'Forno Nero', badge: 'Wood-fired · Naples style', headline: 'Pizza that takes its time.',
    sub: '48-hour dough, a 480 °C oven and a short list of toppings we actually believe in.',
    cta: 'Book a table', secondary: 'See the menu',
    links: [{ label: 'Menu', href: '#menu' }, { label: 'Story', href: '#story' }, { label: 'Visit', href: '#visit' }],
    offeringsTitle: 'From the oven', offerings: [
      { title: 'Marinara', text: 'Tomato, garlic, oregano, olive oil.', price: '12 €' },
      { title: 'Diavola', text: 'Spicy salami, fior di latte, chilli honey.', price: '16 €' },
      { title: 'Funghi', text: 'Mushrooms, taleggio, thyme.', price: '15 €' },
    ],
    stats: [{ value: '480 °C', label: 'Oven temperature' }, { value: '48 h', label: 'Dough rest' }, { value: '12', label: 'Seats at the bar' }, { value: '2019', label: 'Year opened' }],
    storyTitle: 'One oven, two hands', story: ['We open at five and close when the dough runs out.', 'Everything else is a short list of suppliers we can name from memory.'],
    quote: 'The best crust in the city, and they know it.', quoteBy: 'Local guide',
    ctaTitle: 'Walk in or book ahead', ctaText: 'Six tables, one seating at 19:00 and 21:00.', ctaLabel: 'Reserve',
    footerNote: 'Via Roma 12 · open Tue–Sun',
    hero: '/tpl/restaurant-hero.svg', photo: '/tpl/chef.svg', gallery: ['/tpl/restaurant-table.svg', '/tpl/product-1.svg', '/tpl/workshop.svg'],
  }),
  P({
    slug: 'kaze-omakase', name: 'Kaze Omakase', category: 'restaurant',
    description: 'Minimal omakase counter with a set menu and reservation CTA.',
    primary: '#0F766E', background: '#F8FAF9', surface: '#E8F1EF', border: '#D3E4E0', heading: 'Lora', body: 'Inter',
    brand: 'Kaze', badge: 'Omakase · 10 seats', headline: 'Ten seats. One menu. Tonight only.',
    sub: 'A twelve-course counter experience built around what arrives at the market that morning.',
    cta: 'Reserve a seat', secondary: 'The menu',
    links: [{ label: 'Experience', href: '#menu' }, { label: 'Chef', href: '#story' }, { label: 'Reserve', href: '#visit' }],
    offeringsTitle: 'The counter', offerings: [
      { title: 'Twelve courses', text: 'Seasonal fish, warm rice, three hours.', price: '140 €' },
      { title: 'Sake pairing', text: 'Five pours chosen by our sommelier.', price: '60 €' },
      { title: 'Lunch omakase', text: 'Eight courses, faster pace.', price: '90 €' },
    ],
    stats: [{ value: '10', label: 'Seats' }, { value: '12', label: 'Courses' }, { value: '3 h', label: 'Experience' }, { value: '1', label: 'Seating' }],
    storyTitle: 'Behind the counter', story: ['Chef Aiko trained in Kanazawa and opened Kaze in 2021.', 'No menu is written twice — the fish decides.'],
    quote: 'Quiet, precise, unforgettable.', quoteBy: 'Nordic Food Journal',
    ctaTitle: 'Bookings open on the 1st', ctaText: 'We release seats one month ahead at 10:00.', ctaLabel: 'Check availability',
    footerNote: 'Havnegata 4 · Tue–Sat',
    hero: '/tpl/restaurant-table.svg', photo: '/tpl/chef.svg', gallery: ['/tpl/product-2.svg', '/tpl/restaurant-hero.svg', '/tpl/product-3.svg'],
  }),
  P({
    slug: 'root-bowl', name: 'Root & Bowl', category: 'restaurant',
    description: 'Vegan cafe: bowls, weekly menu and delivery note.',
    primary: '#3F6212', background: '#FBFDF7', surface: '#EFF5E4', border: '#DDE9C9', heading: 'Manrope', body: 'DM Sans', radius: 18,
    brand: 'Root & Bowl', badge: 'Plant-based · daily', headline: 'Bowls that keep you full past three.',
    sub: 'Seasonal vegetables, grains cooked properly and dressings made every morning.',
    cta: 'Order for pickup', secondary: 'Weekly menu',
    links: [{ label: 'Menu', href: '#menu' }, { label: 'Delivery', href: '#visit' }, { label: 'About', href: '#story' }],
    offeringsTitle: 'This week', offerings: [
      { title: 'Green bowl', text: 'Barley, broccoli, avocado, tahini.', price: '11 €' },
      { title: 'Root bowl', text: 'Roasted carrots, lentils, dill yoghurt.', price: '12 €' },
      { title: 'Soup + bread', text: 'Changes daily, always vegan.', price: '8 €' },
    ],
    stats: [{ value: '100%', label: 'Plant-based' }, { value: '9', label: 'Bowls on menu' }, { value: '11:00', label: 'Open from' }, { value: '0', label: 'Plastic packaging' }],
    storyTitle: 'Small kitchen, short chain', story: ['We buy from three farms within 40 km.', 'The menu follows the harvest, not the other way around.'],
    quote: 'Finally a lunch place that does not put me to sleep.', quoteBy: 'Office regular',
    ctaTitle: 'Pre-order for noon', ctaText: 'Order before 10:30 and skip the queue.', ctaLabel: 'Order now',
    footerNote: 'Skovveien 9 · Mon–Fri',
    hero: '/tpl/product-2.svg', photo: '/tpl/workshop.svg', gallery: ['/tpl/product-1.svg', '/tpl/product-3.svg', '/tpl/restaurant-table.svg'],
  }),
  P({
    slug: 'north-bean', name: 'North Bean Roastery', category: 'shop',
    description: 'Coffee roastery: beans, subscription and wholesale.',
    primary: '#7C2D12', background: '#FDF8F3', surface: '#F3E8DC', border: '#E4D2C1', heading: 'Space Grotesk', body: 'Inter',
    brand: 'North Bean', badge: 'Roasted weekly in Oslo', headline: 'Coffee with a roast date on it.',
    sub: 'Single origins and a house blend, roasted Tuesday and shipped Wednesday.',
    cta: 'Shop beans', secondary: 'Subscription',
    links: [{ label: 'Beans', href: '#shop' }, { label: 'Wholesale', href: '#story' }, { label: 'Visit', href: '#visit' }],
    offeringsTitle: 'On the shelf', offerings: [
      { title: 'House blend', text: 'Chocolate, hazelnut, easy mornings.', price: '14 €' },
      { title: 'Ethiopia Guji', text: 'Peach, jasmine, filter roast.', price: '19 €' },
      { title: 'Subscription', text: 'Two bags a month, free shipping.', price: '28 €' },
    ],
    stats: [{ value: '6', label: 'Origins' }, { value: 'Tue', label: 'Roast day' }, { value: '48 h', label: 'To your door' }, { value: '2017', label: 'Roasting since' }],
    storyTitle: 'Direct from the farm', story: ['We buy from five producers and publish what we pay.', 'Wholesale partners get the same lot, in bigger bags.'],
    quote: 'The freshest filter roast I have found locally.', quoteBy: 'Cafe owner',
    ctaTitle: 'Wholesale orders', ctaText: 'Weekly delivery for cafes and offices.', ctaLabel: 'Talk to us',
    footerNote: 'Thorvald Meyers gate 30 · Oslo',
    hero: '/tpl/product-1.svg', photo: '/tpl/workshop.svg', gallery: ['/tpl/product-2.svg', '/tpl/product-3.svg', '/tpl/chef.svg'],
  }),
  P({
    slug: 'fade-house', name: 'Fade House', category: 'other',
    description: 'Barbershop: services, prices and online booking.',
    primary: '#0EA5E9', background: '#0B1220', surface: '#111A2C', text: '#F8FAFC', muted: '#94A3B8', border: '#1E293B', primaryContrast: '#04121F',
    heading: 'Space Grotesk', body: 'Inter', radius: 10,
    brand: 'Fade House', badge: 'Barbering · walk-ins welcome', headline: 'Sharp cuts, no small talk.',
    sub: 'Skin fades, classic cuts and beard work by three barbers who have been doing this a while.',
    cta: 'Book now', secondary: 'Price list',
    links: [{ label: 'Services', href: '#menu' }, { label: 'Barbers', href: '#story' }, { label: 'Book', href: '#visit' }],
    offeringsTitle: 'Services', offerings: [
      { title: 'Skin fade', text: '45 minutes, hot towel finish.', price: '38 €' },
      { title: 'Classic cut', text: 'Scissor work, styled.', price: '34 €' },
      { title: 'Beard trim', text: 'Shape, line-up, oil.', price: '22 €' },
    ],
    stats: [{ value: '3', label: 'Barbers' }, { value: '45 min', label: 'Average visit' }, { value: '4.9', label: 'Google rating' }, { value: '7', label: 'Days a week' }],
    storyTitle: 'Behind the chair', story: ['We keep the shop small so nobody waits more than ten minutes.', 'Cash or card, no memberships, no upsells.'],
    quote: 'Best fade I have had in years.', quoteBy: 'Regular since 2022',
    ctaTitle: 'Book your chair', ctaText: 'Same-day slots usually open before noon.', ctaLabel: 'Check slots',
    footerNote: 'Grønnegata 7 · Mon–Sun',
    hero: '/tpl/agency-hero.svg', photo: '/tpl/portrait.svg', gallery: ['/tpl/work-1.svg', '/tpl/work-2.svg', '/tpl/work-3.svg'],
  }),
  P({
    slug: 'lumen-studio', name: 'Lumen Studio', category: 'other',
    description: 'Beauty salon landing with treatments and booking.',
    primary: '#BE185D', background: '#FFF8FB', surface: '#FCE7F0', border: '#F7D2E2', heading: 'Playfair Display', body: 'DM Sans', radius: 20,
    brand: 'Lumen', badge: 'Skin studio · Oslo', headline: 'Skin, looked after properly.',
    sub: 'Facials and small treatments with a plan you can keep up at home.',
    cta: 'Book a consultation', secondary: 'Treatments',
    links: [{ label: 'Treatments', href: '#menu' }, { label: 'Studio', href: '#story' }, { label: 'Book', href: '#visit' }],
    offeringsTitle: 'Treatments', offerings: [
      { title: 'Signature facial', text: '60 minutes, tailored to the day.', price: '95 €' },
      { title: 'Peel', text: 'Mild acid, no downtime.', price: '75 €' },
      { title: 'Consultation', text: '20 minutes, plan and products.', price: '25 €' },
    ],
    stats: [{ value: '9', label: 'Years open' }, { value: '60 min', label: 'Facial' }, { value: '2', label: 'Therapists' }, { value: '4.9', label: 'Rating' }],
    storyTitle: 'A calm room', story: ['No noise, no upselling, one client at a time.', 'We recommend three products, not thirty.'],
    quote: 'The first facial that did not leave my skin angry.', quoteBy: 'Client review',
    ctaTitle: 'First visit?', ctaText: 'Start with a 20-minute consultation.', ctaLabel: 'Book consultation',
    footerNote: 'Inkognitogata 21 · Oslo',
    hero: '/tpl/product-1.svg', photo: '/tpl/portrait.svg', gallery: ['/tpl/product-3.svg', '/tpl/bouquet.svg', '/tpl/workshop.svg'],
  }),
  P({
    slug: 'dental-atelier', name: 'Dental Atelier', category: 'other',
    description: 'Dental clinic: treatments, team and appointment form.',
    primary: '#2563EB', background: '#F8FAFF', surface: '#EAF1FF', border: '#D6E3FF', heading: 'Manrope', body: 'Inter',
    brand: 'Dental Atelier', badge: 'Gentle dentistry', headline: 'Dentistry without the dread.',
    sub: 'Preventive care, clear aligners and same-week appointments for new patients.',
    cta: 'Book a check-up', secondary: 'Treatments',
    links: [{ label: 'Treatments', href: '#menu' }, { label: 'Team', href: '#story' }, { label: 'Contact', href: '#visit' }],
    offeringsTitle: 'Treatments', offerings: [
      { title: 'Check-up', text: 'X-ray, cleaning, plan.', price: '90 €' },
      { title: 'Clear aligners', text: 'Scan, plan, 6–12 months.', price: 'from 2 400 €' },
      { title: 'Emergency', text: 'Same-day pain relief.', price: 'from 120 €' },
    ],
    stats: [{ value: '18', label: 'Years experience' }, { value: '4', label: 'Dentists' }, { value: '0', label: 'Waiting list' }, { value: '4.9', label: 'Patient rating' }],
    storyTitle: 'Explained before it happens', story: ['Every step is shown on screen and priced upfront.', 'We would rather prevent than drill.'],
    quote: 'First dentist appointment I did not postpone twice.', quoteBy: 'New patient',
    ctaTitle: 'New patients welcome', ctaText: 'Usually an appointment within five days.', ctaLabel: 'Request a time',
    footerNote: 'Bogstadveien 44 · Oslo',
    hero: '/tpl/team.svg', photo: '/tpl/portrait.svg', gallery: ['/tpl/hero-consulting.svg', '/tpl/work-2.svg', '/tpl/workshop.svg'],
  }),
  P({
    slug: 'hart-voss', name: 'Hart & Voss', category: 'consulting',
    description: 'Law firm: practice areas, team and consultation CTA.',
    primary: '#1E3A8A', background: '#F8FAFC', surface: '#E8EEF9', border: '#D5DFEE', heading: 'Lora', body: 'Inter', radius: 6,
    brand: 'Hart & Voss', badge: 'Commercial law · Oslo', headline: 'Contracts that hold up.',
    sub: 'Commercial law for founders and family businesses: agreements, disputes and ownership.',
    cta: 'Request a consultation', secondary: 'Practice areas',
    links: [{ label: 'Practice', href: '#menu' }, { label: 'Team', href: '#story' }, { label: 'Contact', href: '#visit' }],
    offeringsTitle: 'Practice areas', offerings: [
      { title: 'Commercial contracts', text: 'Drafting, negotiation, review.', price: '' },
      { title: 'Ownership & equity', text: 'Shareholder agreements, transfers.', price: '' },
      { title: 'Disputes', text: 'Negotiated settlements first.', price: '' },
    ],
    stats: [{ value: '22', label: 'Years in practice' }, { value: '2', label: 'Partners' }, { value: '1', label: 'Point of contact' }, { value: '48 h', label: 'First response' }],
    storyTitle: 'Small firm, direct access', story: ['You work with a partner, not a rotating team.', 'Fixed fees where the scope allows it.'],
    quote: 'They found the clause everyone else missed.', quoteBy: 'Founder, retail group',
    ctaTitle: 'Talk to a lawyer', ctaText: 'A 30-minute call, no obligation.', ctaLabel: 'Request a call',
    footerNote: 'Karl Johans gate 14 · Oslo',
    hero: '/tpl/hero-consulting.svg', photo: '/tpl/team.svg', gallery: ['/tpl/work-2.svg', '/tpl/hero-consulting.svg', '/tpl/workshop.svg'],
  }),
  P({
    slug: 'ledgerly', name: 'Ledgerly', category: 'consulting',
    description: 'Accounting firm: services, pricing and onboarding CTA.',
    primary: '#047857', background: '#F7FCFA', surface: '#E6F4EE', border: '#CFE7DD', heading: 'Manrope', body: 'Inter',
    brand: 'Ledgerly', badge: 'Accounting · monthly', headline: 'Books closed by the 5th.',
    sub: 'Monthly accounting, payroll and VAT for small teams — with a human on the phone.',
    cta: 'Get a quote', secondary: 'What is included',
    links: [{ label: 'Services', href: '#menu' }, { label: 'Pricing', href: '#pricing' }, { label: 'Contact', href: '#visit' }],
    offeringsTitle: 'Plans', offerings: [
      { title: 'Solo', text: 'Bookkeeping, VAT, annual report.', price: '190 €/mo' },
      { title: 'Team', text: 'Payroll up to 10 people.', price: '390 €/mo' },
      { title: 'Custom', text: 'Groups, multiple entities.', price: 'on request' },
    ],
    stats: [{ value: '5th', label: 'Closing date' }, { value: '120+', label: 'Clients' }, { value: '1', label: 'Accountant' }, { value: '0', label: 'Hidden fees' }],
    storyTitle: 'What you actually get', story: ['A named accountant, a monthly summary and answers within a day.', 'We use your tools or ours — no migration theatre.'],
    quote: 'Switching took an afternoon and saved us a week per quarter.', quoteBy: 'Studio founder',
    ctaTitle: 'See your first month free', ctaText: 'No setup fee, cancel anytime.', ctaLabel: 'Get a quote',
    footerNote: 'Dronningens gate 6 · Oslo',
    hero: '/tpl/hero-consulting.svg', photo: '/tpl/team.svg', gallery: ['/tpl/work-1.svg', '/tpl/work-2.svg', '/tpl/workshop.svg'],
  }),
  P({
    slug: 'signal-bureau', name: 'Signal Bureau', category: 'agency',
    description: 'Marketing agency: services, cases and audit CTA.',
    primary: '#7C3AED', background: '#FAF8FF', surface: '#F0EAFE', border: '#E1D6FB', heading: 'Space Grotesk', body: 'DM Sans', radius: 16,
    brand: 'Signal', badge: 'Performance marketing', headline: 'Spend less, learn faster.',
    sub: 'Paid social, landing pages and measurement for teams tired of vanity metrics.',
    cta: 'Get a free audit', secondary: 'See cases',
    links: [{ label: 'Services', href: '#menu' }, { label: 'Cases', href: '#story' }, { label: 'Contact', href: '#visit' }],
    offeringsTitle: 'Services', offerings: [
      { title: 'Paid social', text: 'Meta, TikTok, LinkedIn.', price: 'from 2k €/mo' },
      { title: 'Landing pages', text: 'Design, build, test.', price: 'from 4k €' },
      { title: 'Analytics', text: 'Tracking you can trust.', price: 'from 1.5k €' },
    ],
    stats: [{ value: '38', label: 'Accounts' }, { value: '2.1×', label: 'Median ROAS lift' }, { value: '6', label: 'Specialists' }, { value: '2018', label: 'Since' }],
    storyTitle: 'How we work', story: ['Two-week sprint, one hypothesis, a clear number to beat.', 'You get the dashboard and the reasoning behind it.'],
    quote: 'They killed half our channels and doubled the result.', quoteBy: 'CMO, DTC brand',
    ctaTitle: 'Free 30-minute audit', ctaText: 'Bring your numbers, leave with three actions.', ctaLabel: 'Book audit',
    footerNote: 'Markveien 35 · Oslo',
    hero: '/tpl/hero-consulting.svg', photo: '/tpl/team.svg', gallery: ['/tpl/work-2.svg', '/tpl/work-3.svg', '/tpl/ui.svg'],
  }),
  P({
    slug: 'forma-collective', name: 'Forma Collective', category: 'agency',
    description: 'Design studio portfolio with selected work grid.',
    primary: '#111827', background: '#F5F5F4', surface: '#E7E5E4', border: '#D6D3D1', heading: 'Space Grotesk', body: 'Inter', radius: 4,
    brand: 'Forma', badge: 'Design studio · Berlin', headline: 'Identity and interfaces, built to last.',
    sub: 'Brand systems, product design and the design systems that keep them consistent.',
    cta: 'Start a project', secondary: 'Selected work',
    links: [{ label: 'Work', href: '#story' }, { label: 'Studio', href: '#menu' }, { label: 'Contact', href: '#visit' }],
    offeringsTitle: 'What we do', offerings: [
      { title: 'Brand identity', text: 'Positioning, marks, guidelines.', price: '' },
      { title: 'Product design', text: 'Flows, UI, prototypes.', price: '' },
      { title: 'Design systems', text: 'Tokens, components, docs.', price: '' },
    ],
    stats: [{ value: '24', label: 'Projects shipped' }, { value: '7', label: 'People' }, { value: '3', label: 'Countries' }, { value: '2016', label: 'Founded' }],
    storyTitle: 'A small studio', story: ['We take three projects at a time.', 'Every project gets a partner, not an account manager.'],
    quote: 'The rare studio that documents what it designs.', quoteBy: 'Head of Product, fintech',
    ctaTitle: 'Have a project?', ctaText: 'Tell us the problem and the deadline.', ctaLabel: 'Get in touch',
    footerNote: 'Oranienstraße 4 · Berlin',
    hero: '/tpl/agency-hero.svg', photo: '/tpl/team.svg', gallery: ['/tpl/work-1.svg', '/tpl/work-2.svg', '/tpl/work-3.svg'],
  }),
  P({
    slug: 'studio-grain', name: 'Studio Grain', category: 'personal',
    description: 'Photographer portfolio with series and booking.',
    primary: '#78350F', background: '#FDFBF7', surface: '#F1E9DD', border: '#E2D5C4', heading: 'Lora', body: 'DM Sans',
    brand: 'Studio Grain', badge: 'Photography · Oslo', headline: 'Light, patience, a little luck.',
    sub: 'Portraits, editorial and interiors. Film when the project allows it.',
    cta: 'Book a shoot', secondary: 'Portfolio',
    links: [{ label: 'Work', href: '#story' }, { label: 'Services', href: '#menu' }, { label: 'Book', href: '#visit' }],
    offeringsTitle: 'Sessions', offerings: [
      { title: 'Portrait', text: '90 minutes, two looks.', price: '450 €' },
      { title: 'Editorial', text: 'Half day, team included.', price: '1 200 €' },
      { title: 'Interiors', text: 'Per room, styled.', price: '300 €' },
    ],
    stats: [{ value: '11', label: 'Years shooting' }, { value: '40+', label: 'Editorials' }, { value: '2', label: 'Cameras' }, { value: '48 h', label: 'Preview' }],
    storyTitle: 'About the studio', story: ['Natural light first, gear second.', 'Prints are made in-house on archival paper.'],
    quote: 'She made a nervous subject look like themselves.', quoteBy: 'Magazine editor',
    ctaTitle: 'Booking spring sessions', ctaText: 'Two slots per week, usually Thursdays.', ctaLabel: 'Check dates',
    footerNote: 'Sofienberggata 8 · Oslo',
    hero: '/tpl/portrait.svg', photo: '/tpl/workshop.svg', gallery: ['/tpl/team.svg', '/tpl/agency-hero.svg', '/tpl/portrait.svg'],
  }),
  P({
    slug: 'aster-events', name: 'Aster Events', category: 'other',
    description: 'Wedding planner with packages and gallery.',
    primary: '#9D174D', background: '#FFF9FB', surface: '#FBEDF3', border: '#F3D8E4', heading: 'Playfair Display', body: 'Lora', radius: 20,
    brand: 'Aster', badge: 'Weddings & events', headline: 'The day, without the spreadsheet.',
    sub: 'Full planning or month-of coordination for couples who want to be guests at their own wedding.',
    cta: 'Check availability', secondary: 'Packages',
    links: [{ label: 'Packages', href: '#menu' }, { label: 'Gallery', href: '#story' }, { label: 'Contact', href: '#visit' }],
    offeringsTitle: 'Packages', offerings: [
      { title: 'Full planning', text: 'From venue to last dance.', price: 'from 4 500 €' },
      { title: 'Month-of', text: 'We take over four weeks out.', price: 'from 1 800 €' },
      { title: 'Day-of', text: 'Coordination on the day.', price: 'from 900 €' },
    ],
    stats: [{ value: '60+', label: 'Weddings' }, { value: '1', label: 'Planner per event' }, { value: '9', label: 'Preferred venues' }, { value: '2015', label: 'Since' }],
    storyTitle: 'Calm on the day', story: ['We build a minute-by-minute plan and carry it.', 'Vendors are chosen together, never pushed.'],
    quote: 'I did not think about logistics once.', quoteBy: 'Bride, 2024',
    ctaTitle: '2026 dates are open', ctaText: 'Most couples book 9–12 months ahead.', ctaLabel: 'Ask about your date',
    footerNote: 'Bygdøy allé 3 · Oslo',
    hero: '/tpl/bouquet.svg', photo: '/tpl/workshop.svg', gallery: ['/tpl/restaurant-table.svg', '/tpl/product-3.svg', '/tpl/bouquet.svg'],
  }),
  P({
    slug: 'nord-homes', name: 'Nord Homes', category: 'other',
    description: 'Real estate agent with listings and valuation CTA.',
    primary: '#1D4ED8', background: '#F8FAFF', surface: '#E9EFFF', border: '#D5E0FA', heading: 'Manrope', body: 'Inter',
    brand: 'Nord Homes', badge: 'Real estate · Oslo west', headline: 'Sold for more, explained why.',
    sub: 'Valuation, styling and marketing for apartments that deserve a proper launch.',
    cta: 'Book a valuation', secondary: 'Recent sales',
    links: [{ label: 'Listings', href: '#story' }, { label: 'Services', href: '#menu' }, { label: 'Valuation', href: '#visit' }],
    offeringsTitle: 'Services', offerings: [
      { title: 'Valuation', text: 'Market analysis in 48 hours.', price: 'free' },
      { title: 'Styling', text: 'Furniture, light, photos.', price: 'from 1 500 €' },
      { title: 'Sale', text: 'Full marketing package.', price: 'commission' },
    ],
    stats: [{ value: '3.2%', label: 'Above asking, avg' }, { value: '14', label: 'Days to offer' }, { value: '120+', label: 'Sales' }, { value: '4.9', label: 'Rating' }],
    storyTitle: 'Recent sales', story: ['Frogner: 62 m², 12 viewings, sold 8% over asking.', 'Grünerløkka: 48 m², sold in four days.'],
    quote: 'The photos alone were worth the commission.', quoteBy: 'Seller, Majorstuen',
    ctaTitle: 'What is your flat worth?', ctaText: 'A real valuation, not an automated estimate.', ctaLabel: 'Book valuation',
    footerNote: 'Hegdehaugsveien 22 · Oslo',
    hero: '/tpl/ui.svg', photo: '/tpl/team.svg', gallery: ['/tpl/work-1.svg', '/tpl/hero-consulting.svg', '/tpl/work-2.svg'],
  }),
  P({
    slug: 'fjord-house', name: 'Fjord House', category: 'other',
    description: 'Boutique hotel with rooms, amenities and booking.',
    primary: '#0F4C5C', background: '#F7FAFA', surface: '#E6F0F1', border: '#CFE1E3', heading: 'Lora', body: 'Inter',
    brand: 'Fjord House', badge: 'Boutique hotel · 14 rooms', headline: 'A quiet base above the water.',
    sub: 'Fourteen rooms, a small kitchen and a view that does most of the work.',
    cta: 'Check availability', secondary: 'Rooms',
    links: [{ label: 'Rooms', href: '#menu' }, { label: 'House', href: '#story' }, { label: 'Book', href: '#visit' }],
    offeringsTitle: 'Rooms', offerings: [
      { title: 'Fjord view', text: 'Queen bed, balcony.', price: '220 €' },
      { title: 'Garden', text: 'Twin beds, quiet side.', price: '180 €' },
      { title: 'Suite', text: 'Separate living room.', price: '340 €' },
    ],
    stats: [{ value: '14', label: 'Rooms' }, { value: '1904', label: 'Building' }, { value: '7', label: 'Minutes to ferry' }, { value: '4.8', label: 'Guest rating' }],
    storyTitle: 'The house', story: ['A former harbour office, renovated in 2022.', 'Breakfast is local, small and served until eleven.'],
    quote: 'We extended twice and still did not want to leave.', quoteBy: 'Guest, Copenhagen',
    ctaTitle: 'Direct booking', ctaText: 'Best rate when you book with us.', ctaLabel: 'See availability',
    footerNote: 'Strandgata 2 · Åsgårdstrand',
    hero: '/tpl/restaurant-table.svg', photo: '/tpl/workshop.svg', gallery: ['/tpl/hero-consulting.svg', '/tpl/product-3.svg', '/tpl/team.svg'],
  }),
  P({
    slug: 'berg-build', name: 'Berg Build', category: 'other',
    description: 'Construction company with projects and quote form.',
    primary: '#B45309', background: '#FBF8F1', surface: '#F2E9D8', border: '#E3D5BE', heading: 'Manrope', body: 'Inter', radius: 8,
    brand: 'Berg Build', badge: 'Construction · since 1987', headline: 'On budget, or we say so early.',
    sub: 'Extensions, renovations and small commercial builds across the region.',
    cta: 'Request a quote', secondary: 'Projects',
    links: [{ label: 'Projects', href: '#story' }, { label: 'Services', href: '#menu' }, { label: 'Quote', href: '#visit' }],
    offeringsTitle: 'Services', offerings: [
      { title: 'Extensions', text: 'Design to handover.', price: '' },
      { title: 'Renovation', text: 'Full or room by room.', price: '' },
      { title: 'Commercial', text: 'Offices and retail.', price: '' },
    ],
    stats: [{ value: '37', label: 'Years building' }, { value: '240+', label: 'Projects' }, { value: '12', label: 'Crew' }, { value: '0', label: 'Open disputes' }],
    storyTitle: 'How projects run', story: ['A named site manager, weekly photos, no surprise invoices.', 'If the budget moves, you hear it before the work starts.'],
    quote: 'They finished a month early and cleaned up every day.', quoteBy: 'Homeowner, Bærum',
    ctaTitle: 'Planning a build?', ctaText: 'Send drawings or a rough idea.', ctaLabel: 'Request a quote',
    footerNote: 'Industriveien 14 · Drammen',
    hero: '/tpl/agency-hero.svg', photo: '/tpl/workshop.svg', gallery: ['/tpl/work-1.svg', '/tpl/work-3.svg', '/tpl/team.svg'],
  }),
  P({
    slug: 'vita-clinic', name: 'Vita Clinic', category: 'other',
    description: 'Medical clinic with specialties and appointments.',
    primary: '#0891B2', background: '#F7FCFD', surface: '#E5F4F8', border: '#CCE7EE', heading: 'Manrope', body: 'Inter',
    brand: 'Vita', badge: 'Private clinic · Oslo', headline: 'A doctor who has time.',
    sub: 'General practice, dermatology and physiotherapy under one roof.',
    cta: 'Book appointment', secondary: 'Specialties',
    links: [{ label: 'Specialties', href: '#menu' }, { label: 'Team', href: '#story' }, { label: 'Contact', href: '#visit' }],
    offeringsTitle: 'Specialties', offerings: [
      { title: 'General practice', text: '30-minute consultations.', price: 'from 60 €' },
      { title: 'Dermatology', text: 'Skin checks and treatment.', price: 'from 95 €' },
      { title: 'Physiotherapy', text: 'Assessment and plan.', price: 'from 70 €' },
    ],
    stats: [{ value: '9', label: 'Clinicians' }, { value: '30 min', label: 'Consultation' }, { value: '48 h', label: 'Wait time' }, { value: '4.9', label: 'Rating' }],
    storyTitle: 'Time to be heard', story: ['Appointments are 30 minutes, not 12.', 'Referrals only when they help.'],
    quote: 'First appointment where I did not feel rushed.', quoteBy: 'Patient',
    ctaTitle: 'New patients', ctaText: 'Registered in two minutes at the desk.', ctaLabel: 'Book appointment',
    footerNote: 'St. Olavs plass 5 · Oslo',
    hero: '/tpl/team.svg', photo: '/tpl/portrait.svg', gallery: ['/tpl/hero-consulting.svg', '/tpl/work-2.svg', '/tpl/workshop.svg'],
  }),
  P({
    slug: 'lingua-lab', name: 'Lingua Lab', category: 'other',
    description: 'Language school with courses and trial lesson.',
    primary: '#4338CA', background: '#F8F8FF', surface: '#ECEBFF', border: '#DAD8FF', heading: 'Space Grotesk', body: 'DM Sans', radius: 18,
    brand: 'Lingua Lab', badge: 'Languages · small groups', headline: 'Speak by week six.',
    sub: 'Norwegian, English and Spanish in groups of five, online or in the studio.',
    cta: 'Try a lesson', secondary: 'Courses',
    links: [{ label: 'Courses', href: '#menu' }, { label: 'Method', href: '#story' }, { label: 'Enroll', href: '#visit' }],
    offeringsTitle: 'Courses', offerings: [
      { title: 'Norwegian A1', text: '8 weeks, twice a week.', price: '390 €' },
      { title: 'Conversation', text: 'Drop-in speaking club.', price: '15 €' },
      { title: 'Private', text: 'Tailored one-to-one.', price: '65 €/h' },
    ],
    stats: [{ value: '5', label: 'Students per group' }, { value: '8', label: 'Weeks' }, { value: '92%', label: 'Finish the course' }, { value: '3', label: 'Languages' }],
    storyTitle: 'Method', story: ['Speaking from minute one, grammar in context.', 'Homework is fifteen minutes, not an hour.'],
    quote: 'I moved from ordering coffee to a job interview.', quoteBy: 'Student, A2',
    ctaTitle: 'First lesson free', ctaText: 'Join a group and see how it feels.', ctaLabel: 'Book a trial',
    footerNote: 'Torggata 11 · Oslo',
    hero: '/tpl/hero-consulting.svg', photo: '/tpl/team.svg', gallery: ['/tpl/work-1.svg', '/tpl/work-2.svg', '/tpl/workshop.svg'],
  }),
  P({
    slug: 'open-hands', name: 'Open Hands', category: 'other',
    description: 'Charity landing with mission, numbers and donation CTA.',
    primary: '#15803D', background: '#F8FCF8', surface: '#E8F3E8', border: '#D1E6D1', heading: 'Manrope', body: 'Inter',
    brand: 'Open Hands', badge: 'Non-profit · transparent', headline: 'Every krone has an address.',
    sub: 'We fund small, local projects and publish every receipt.',
    cta: 'Donate monthly', secondary: 'Our projects',
    links: [{ label: 'Projects', href: '#menu' }, { label: 'Reports', href: '#story' }, { label: 'Donate', href: '#visit' }],
    offeringsTitle: 'What we fund', offerings: [
      { title: 'School kits', text: 'Books and materials.', price: '12 €' },
      { title: 'Clean water', text: 'Filters for a family.', price: '40 €' },
      { title: 'Micro-grants', text: 'Seed money for local founders.', price: '250 €' },
    ],
    stats: [{ value: '94%', label: 'Goes to projects' }, { value: '38', label: 'Active projects' }, { value: '11', label: 'Countries' }, { value: '2014', label: 'Founded' }],
    storyTitle: 'Radically boring reporting', story: ['Quarterly PDFs with every transfer listed.', 'No stock photos of children in our reports.'],
    quote: 'The only charity I can audit in an afternoon.', quoteBy: 'Monthly donor',
    ctaTitle: 'Give what you can', ctaText: 'Monthly or one-off, cancel anytime.', ctaLabel: 'Donate',
    footerNote: 'Storgata 26 · Oslo',
    hero: '/tpl/product-2.svg', photo: '/tpl/workshop.svg', gallery: ['/tpl/product-1.svg', '/tpl/product-3.svg', '/tpl/team.svg'],
  }),
  P({
    slug: 'metricly', name: 'Metricly', category: 'saas',
    description: 'SaaS analytics landing: features, metrics and trial.',
    primary: '#5B21B6', background: '#FBFAFF', surface: '#F2EDFF', border: '#E3D9FF', heading: 'Manrope', body: 'Inter', radius: 16,
    brand: 'Metricly', badge: 'Product analytics', headline: 'Know which feature pays the bills.',
    sub: 'Event tracking, funnels and retention without a data team.',
    cta: 'Start free trial', secondary: 'See demo',
    links: [{ label: 'Product', href: '#menu' }, { label: 'Pricing', href: '#visit' }, { label: 'Docs', href: '#story' }],
    offeringsTitle: 'Why teams switch', offerings: [
      { title: 'No SQL', text: 'Ask questions in plain language.', price: '' },
      { title: 'Retention', text: 'Cohorts that update hourly.', price: '' },
      { title: 'Alerts', text: 'Tell Slack when a funnel breaks.', price: '' },
    ],
    stats: [{ value: '14 days', label: 'Free trial' }, { value: '2 min', label: 'Setup' }, { value: '99.99%', label: 'Uptime' }, { value: '1.2k', label: 'Teams' }],
    storyTitle: 'Built by operators', story: ['We ran product teams and hated the reporting gap.', 'Metricly is the tool we wanted then.'],
    quote: 'We cancelled three dashboards and a BI contract.', quoteBy: 'Head of Product, SaaS',
    ctaTitle: 'Try it on your own data', ctaText: 'No card, no call, full access.', ctaLabel: 'Start free',
    footerNote: 'Oslo · remote-first',
    hero: '/tpl/ui.svg', photo: '/tpl/team.svg', gallery: ['/tpl/work-2.svg', '/tpl/ui.svg', '/tpl/work-1.svg'],
  }),
  P({
    slug: 'relay-crm', name: 'Relay CRM', category: 'saas',
    description: 'CRM for small teams: pipeline, features, trial.',
    primary: '#0E7490', background: '#F7FCFD', surface: '#E4F3F7', border: '#CBE5EC', heading: 'Manrope', body: 'Inter',
    brand: 'Relay', badge: 'CRM · for 2–20 people', headline: 'A pipeline nobody has to maintain.',
    sub: 'Contacts, deals and follow-ups that update themselves from email.',
    cta: 'Start free', secondary: 'Watch demo',
    links: [{ label: 'Features', href: '#menu' }, { label: 'Pricing', href: '#visit' }, { label: 'Security', href: '#story' }],
    offeringsTitle: 'Features', offerings: [
      { title: 'Auto-logging', text: 'Emails and calls attached.', price: '' },
      { title: 'Reminders', text: 'Follow-ups that do not slip.', price: '' },
      { title: 'Reports', text: 'One page, updated live.', price: '' },
    ],
    stats: [{ value: '5 min', label: 'Import' }, { value: '18', label: 'Integrations' }, { value: '0', label: 'Training calls' }, { value: '4.7', label: 'G2 rating' }],
    storyTitle: 'Boring on purpose', story: ['No custom objects, no admin console.', 'The whole team can use it on day one.'],
    quote: 'Our sales follow-ups stopped falling through.', quoteBy: 'Founder, agency',
    ctaTitle: 'Free for 14 days', ctaText: 'Then 19 € per seat, no annual lock-in.', ctaLabel: 'Start free',
    footerNote: 'Oslo · GDPR-ready',
    hero: '/tpl/ui.svg', photo: '/tpl/team.svg', gallery: ['/tpl/work-3.svg', '/tpl/ui.svg', '/tpl/work-1.svg'],
  }),
  P({
    slug: 'stackpilot', name: 'Stackpilot', category: 'saas',
    description: 'Developer tool landing: CLI, features, install command.',
    primary: '#22C55E', background: '#0B1220', surface: '#111C2E', text: '#E2E8F0', muted: '#94A3B8', border: '#1E293B', primaryContrast: '#04160A',
    heading: 'Space Grotesk', body: 'Inter', radius: 10,
    brand: 'Stackpilot', badge: 'Developer tools', headline: 'Deploys you can explain on a napkin.',
    sub: 'Preview environments, one command, no YAML archaeology.',
    cta: 'Install now', secondary: 'Read docs',
    links: [{ label: 'Docs', href: '#story' }, { label: 'Pricing', href: '#visit' }, { label: 'GitHub', href: '#menu' }],
    offeringsTitle: 'What it does', offerings: [
      { title: 'Preview envs', text: 'Every PR gets a URL.', price: '' },
      { title: 'Rollbacks', text: 'One command, ten seconds.', price: '' },
      { title: 'Secrets', text: 'Scoped per environment.', price: '' },
    ],
    stats: [{ value: '10 s', label: 'Rollback' }, { value: '40+', label: 'Stacks' }, { value: '0', label: 'YAML files' }, { value: '4.8', label: 'Rating' }],
    storyTitle: 'Why another deploy tool', story: ['We wanted previews without maintaining Kubernetes.', 'So we built the boring version.'],
    quote: 'Deleted 900 lines of CI config on day one.', quoteBy: 'Staff engineer',
    ctaTitle: 'Free for open source', ctaText: 'Install in one command.', ctaLabel: 'Get started',
    footerNote: 'Open core · self-host option',
    hero: '/tpl/agency-hero.svg', photo: '/tpl/ui.svg', gallery: ['/tpl/work-2.svg', '/tpl/work-1.svg', '/tpl/ui.svg'],
  }),
  P({
    slug: 'atlas-goods', name: 'Atlas Goods', category: 'shop',
    description: 'Product store with collection grid and shipping info.',
    primary: '#365314', background: '#FBFAF5', surface: '#F1EFE0', border: '#E0DCC4', heading: 'Space Grotesk', body: 'DM Sans', radius: 6,
    brand: 'Atlas Goods', badge: 'Everyday objects', headline: 'Things you keep for ten years.',
    sub: 'Canvas, steel and wood. Made in small batches, repaired forever.',
    cta: 'Shop the collection', secondary: 'Our materials',
    links: [{ label: 'Shop', href: '#menu' }, { label: 'Materials', href: '#story' }, { label: 'Shipping', href: '#visit' }],
    offeringsTitle: 'Bestsellers', offerings: [
      { title: 'Field tote', text: '18 oz canvas, leather base.', price: '95 €' },
      { title: 'Desk tray', text: 'Powder-coated steel.', price: '45 €' },
      { title: 'Stool', text: 'Oak, three heights.', price: '180 €' },
    ],
    stats: [{ value: '10 yr', label: 'Repair promise' }, { value: '3', label: 'Materials' }, { value: '2', label: 'Factories' }, { value: '2016', label: 'Since' }],
    storyTitle: 'Repair, not replace', story: ['Send it back, we fix it for the cost of shipping.', 'The designs change slowly on purpose.'],
    quote: 'The tote has been to eight countries and looks better.', quoteBy: 'Customer',
    ctaTitle: 'Free shipping over 100 €', ctaText: 'Returns within 30 days.', ctaLabel: 'Shop now',
    footerNote: 'Ships from Oslo · EU',
    hero: '/tpl/product-3.svg', photo: '/tpl/workshop.svg', gallery: ['/tpl/product-1.svg', '/tpl/product-2.svg', '/tpl/product-3.svg'],
  }),
  P({
    slug: 'mara-vik', name: 'Mara Vik', category: 'personal',
    description: 'Personal portfolio: about, selected projects, contact.',
    primary: '#111827', background: '#FAFAF9', surface: '#F0EFEC', border: '#DEDCD6', heading: 'Space Grotesk', body: 'Inter', radius: 8,
    brand: 'Mara Vik', badge: 'Product designer · Oslo', headline: 'Interfaces that get out of the way.',
    sub: 'Ten years of product design for tools people use every day.',
    cta: 'Work with me', secondary: 'Selected work',
    links: [{ label: 'Work', href: '#story' }, { label: 'About', href: '#menu' }, { label: 'Contact', href: '#visit' }],
    offeringsTitle: 'How I help', offerings: [
      { title: 'Product design', text: 'Flows, UI, prototypes.', price: '' },
      { title: 'Design systems', text: 'From audit to adoption.', price: '' },
      { title: 'Advisory', text: 'Weekly design reviews.', price: '' },
    ],
    stats: [{ value: '10', label: 'Years designing' }, { value: '30+', label: 'Products' }, { value: '4', label: 'Countries' }, { value: '2', label: 'Open slots' }],
    storyTitle: 'About', story: ['I work best embedded in a team for 6–12 weeks.', 'Previously design lead at two B2B platforms.'],
    quote: 'Mara shipped more clarity in three weeks than we had in a year.', quoteBy: 'VP Product',
    ctaTitle: 'Two slots this quarter', ctaText: 'Tell me about the product and the constraint.', ctaLabel: 'Say hello',
    footerNote: 'Oslo · available remotely',
    hero: '/tpl/portrait.svg', photo: '/tpl/workshop.svg', gallery: ['/tpl/work-1.svg', '/tpl/work-2.svg', '/tpl/ui.svg'],
  }),
];

/* ── document builder ───────────────────────────────────── */

type Layout = 'split' | 'centered' | 'image-first';

function hero(p: Preset, layout: Layout): PageNode {
  const content = [
    badge(p.badge),
    heading(p.headline, 1, { fontSize: { base: layout === 'centered' ? 60 : 52, mobile: 34 }, lineHeight: { base: 1.05 }, textAlign: { base: layout === 'centered' ? 'center' : 'left' }, maxWidth: { base: 680 } }),
    text(p.sub, { size: 'lg', muted: true, align: layout === 'centered' ? 'center' : 'left' }, { maxWidth: { base: 560 } }),
    cols([button(p.cta), p.secondary ? button(p.secondary, '#menu', 'secondary') : button('Learn more', '#story', 'ghost')], { maxWidth: { base: 420 } }),
  ];

  if (layout === 'split') {
    return section({}, { padding: { base: [72, 24, 64, 24], mobile: [44, 16, 44, 16] }, background: { base: '#F8FAFC' } }, [
      cols([node('container', {}, {}, content), image(p.hero, p.brand, '4/5')], { gap: { base: 48 } }),
    ]);
  }
  if (layout === 'image-first') {
    return section({}, { padding: { base: [40, 24, 64, 24], mobile: [28, 16, 44, 16] }, background: { base: '#F8FAFC' } }, [
      image(p.hero, p.brand, '21/9'),
      ...content,
    ]);
  }
  return section({}, { padding: { base: [80, 24, 64, 24], mobile: [48, 16, 44, 16] }, background: { base: '#F8FAFC' } }, [
    node('container', {}, { align: { base: 'center' } }, content),
    image(p.hero, p.brand, '16/7', { margin: { base: 8 } }),
  ]);
}

function document(p: Preset, layout: Layout): PageDocument {
  const sections: PageNode[] = [
    section({ tag: 'header' }, { padding: { base: [16, 24, 16, 24] }, background: { base: p.background ?? '#FFFFFF' } }, [
      nav(p.brand, p.links, p.cta),
    ]),
    hero(p, layout),
    section({}, { padding: { base: [44, 24, 44, 24] }, background: { base: '#FFFFFF' }, borderColor: { base: p.border ?? '#E2E8F0' }, borderWidth: { base: 1 } }, [
      grid(p.stats.map((s) => stat(s.value, s.label)), 4),
    ]),
    section({}, { padding: { base: [72, 24, 72, 24], mobile: [44, 16, 44, 16] }, background: { base: p.surface ?? '#F6F8FC' } }, [
      badge('What we do'),
      heading(p.offeringsTitle, 2, { fontSize: { base: 38, mobile: 26 } }),
      grid(
        p.offerings.map((o) =>
          card([
            heading(o.title, 3, { fontSize: { base: 21 } }),
            text(o.text, { muted: true }),
            ...(o.price ? [text(o.price, { size: 'sm' })] : []),
            button('Learn more', '#visit', 'ghost'),
          ], { background: { base: p.background ?? '#FFFFFF' } }),
        ),
        3,
      ),
    ]),
    section({}, { padding: { base: [72, 24, 72, 24], mobile: [44, 16, 44, 16] } }, [
      cols([
        image(p.photo, p.storyTitle, '4/5'),
        node('container', {}, {}, [
          badge('About'),
          heading(p.storyTitle, 2, { fontSize: { base: 36, mobile: 26 } }),
          ...p.story.map((paragraph) => text(paragraph, { size: 'lg', muted: true })),
          button('Read more', '#story', 'secondary'),
        ]),
      ], { gap: { base: 48 } }),
    ]),
    section({}, { padding: { base: [64, 24, 64, 24], mobile: [40, 16, 40, 16] }, background: { base: p.surface ?? '#F6F8FC' } }, [
      heading('Inside', 2, { fontSize: { base: 32, mobile: 24 } }),
      grid(p.gallery.map((src, index) => image(src, `${p.brand} ${index + 1}`, '4/3')), 3),
    ]),
    section({}, { padding: { base: [64, 24, 64, 24] } }, [
      heading(`“${p.quote}”`, 3, { fontSize: { base: 26, mobile: 20 }, textAlign: { base: 'center' }, maxWidth: { base: 720 } }),
      text(p.quoteBy, { size: 'sm', align: 'center', muted: true }),
    ]),
    section({ container: true }, { padding: { base: [72, 24, 72, 24], mobile: [48, 16, 48, 16] }, background: { base: '#111827' }, color: { base: '#FFFFFF' } }, [
      heading(p.ctaTitle, 2, { fontSize: { base: 40, mobile: 28 }, textAlign: { base: 'center' }, maxWidth: { base: 720 } }),
      text(p.ctaText, { align: 'center', size: 'lg', muted: true }),
      button(p.ctaLabel, '#visit', 'primary', 'center'),
    ]),
    footer(p.brand, p.footerNote),
  ];

  return { schemaVersion: 1, theme: theme(p), sections };
}

const LAYOUTS: Layout[] = ['split', 'centered', 'image-first'];

export type GeneratedTemplate = {
  name: string;
  slug: string;
  category: Preset['category'];
  description: string;
  thumbnailUrl: string | null;
  document: PageDocument;
};

/** 30 presets × 3 layouts = 90 unique templates. */
export const generatedTemplates: GeneratedTemplate[] = presets.flatMap((preset) =>
  LAYOUTS.map((layout, index) => ({
    name: index === 0 ? preset.name : `${preset.name} · ${layout === 'centered' ? 'Centered' : 'Editorial'}`,
    slug: index === 0 ? preset.slug : `${preset.slug}-${layout}`,
    category: preset.category,
    description: preset.description,
    thumbnailUrl: preset.hero,
    document: document(preset, layout),
  })),
);
