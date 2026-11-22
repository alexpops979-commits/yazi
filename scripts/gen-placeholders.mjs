/**
 * Generates local abstract cover images for the system templates.
 * Run: node scripts/gen-placeholders.mjs
 *
 * Why local: published sites must not depend on a third-party image host
 * (blocked networks, rate limits, downtime). Deterministic SVGs render offline.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('apps/web/public/tpl');
mkdirSync(OUT_DIR, { recursive: true });

const assets = [
  { name: 'hero-consulting', w: 1000, h: 1100, from: '#EEF3FF', to: '#C9D8FF', ink: '#2F5BEA', accent: '#8FAEFF' },
  { name: 'team', w: 900, h: 900, from: '#F4F7FF', to: '#DCE6FF', ink: '#234BDB', accent: '#B8CCFF' },
  { name: 'restaurant-hero', w: 1400, h: 760, from: '#2A221C', to: '#4A382C', ink: '#E9C9A8', accent: '#B4552D' },
  { name: 'restaurant-table', w: 1400, h: 760, from: '#F5EDE4', to: '#E3D2BF', ink: '#B4552D', accent: '#7A6A5F' },
  { name: 'chef', w: 900, h: 900, from: '#EFE3D6', to: '#DCC8B4', ink: '#8A5A3B', accent: '#C98A5B' },
  { name: 'agency-hero', w: 1500, h: 700, from: '#0B0F0C', to: '#1B2A1F', ink: '#D5FF4F', accent: '#4E7A5A' },
  { name: 'work-1', w: 900, h: 620, from: '#131A15', to: '#26382B', ink: '#D5FF4F', accent: '#7EA98B' },
  { name: 'work-2', w: 900, h: 620, from: '#141824', to: '#2A3550', ink: '#8FB8FF', accent: '#5E7BFF' },
  { name: 'work-3', w: 900, h: 620, from: '#1A1418', to: '#3A2630', ink: '#FF9BC2', accent: '#B85C7F' },
  { name: 'bouquet', w: 900, h: 1100, from: '#FBF9F6', to: '#EFE4DA', ink: '#2F3E46', accent: '#B9C9B0' },
  { name: 'product-1', w: 800, h: 700, from: '#F7F1EA', to: '#E8D9CC', ink: '#C07C8A', accent: '#E8B4BE' },
  { name: 'product-2', w: 800, h: 700, from: '#F4F6F1', to: '#DDE6D6', ink: '#6F8A5E', accent: '#AFC79B' },
  { name: 'product-3', w: 800, h: 700, from: '#F6F1E9', to: '#E4D8C7', ink: '#A9805A', accent: '#D8B893' },
  { name: 'workshop', w: 900, h: 700, from: '#F1EDE7', to: '#E2D8CB', ink: '#6C7A65', accent: '#B9C4AE' },
  { name: 'portrait', w: 900, h: 1100, from: '#EFF5F2', to: '#D6E5DE', ink: '#1F6F5C', accent: '#94BFB0' },
  { name: 'ui', w: 1400, h: 760, from: '#0F1226', to: '#241C4A', ink: '#B9A6FF', accent: '#6D4AFF' },
  { name: 'template-consulting', w: 800, h: 560, from: '#EEF3FF', to: '#C9D8FF', ink: '#2F5BEA', accent: '#8FAEFF' },
  { name: 'template-agency', w: 800, h: 560, from: '#0B0F0C', to: '#26382B', ink: '#D5FF4F', accent: '#7EA98B' },
  { name: 'template-shop', w: 800, h: 560, from: '#FBF9F6', to: '#E9DCCF', ink: '#2F3E46', accent: '#C79AA7' },
  { name: 'template-restaurant', w: 800, h: 560, from: '#F5EDE4', to: '#DFC9B2', ink: '#B4552D', accent: '#7A6A5F' },
  { name: 'template-personal', w: 800, h: 560, from: '#EFF5F2', to: '#CFE2DA', ink: '#1F6F5C', accent: '#94BFB0' },
  { name: 'template-saas', w: 800, h: 560, from: '#F4F1FF', to: '#D9D0FF', ink: '#6D4AFF', accent: '#B9A6FF' },
];

function rng(seedText) {
  let seed = 0;
  for (const char of seedText) seed = (seed * 31 + char.charCodeAt(0)) % 2147483647;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function buildSvg({ name, w, h, from, to, ink, accent }) {
  const random = rng(name);
  const shapes = [];
  const count = 5 + Math.floor(random() * 4);

  for (let index = 0; index < count; index += 1) {
    const cx = Math.round(random() * w);
    const cy = Math.round(random() * h);
    const radius = Math.round((0.12 + random() * 0.3) * Math.min(w, h));
    const fill = index % 2 === 0 ? ink : accent;
    const opacity = (0.08 + random() * 0.16).toFixed(2);
    shapes.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fill}" opacity="${opacity}" />`);
  }

  // A couple of crisp geometric accents so the covers read as "designed", not noise.
  shapes.push(
    `<rect x="${Math.round(w * 0.62)}" y="${Math.round(h * 0.12)}" width="${Math.round(w * 0.26)}" height="${Math.round(h * 0.26)}" rx="${Math.round(w * 0.03)}" fill="${ink}" opacity="0.10" transform="rotate(${Math.round(random() * 20 - 10)} ${Math.round(w * 0.75)} ${Math.round(h * 0.25)})" />`,
  );
  shapes.push(
    `<path d="M0 ${Math.round(h * 0.86)} Q ${Math.round(w * 0.3)} ${Math.round(h * 0.72)} ${Math.round(w * 0.55)} ${Math.round(h * 0.84)} T ${w} ${Math.round(h * 0.78)} V ${h} H 0 Z" fill="${accent}" opacity="0.14" />`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${name}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}" />
      <stop offset="100%" stop-color="${to}" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)" />
  ${shapes.join('\n  ')}
</svg>
`;
}

for (const asset of assets) {
  writeFileSync(path.join(OUT_DIR, `${asset.name}.svg`), buildSvg(asset), 'utf8');
}

console.log(`Generated ${assets.length} covers in ${OUT_DIR}`);
