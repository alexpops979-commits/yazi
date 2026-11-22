/**
 * Renders the app icon from SVG into PNG sizes and a Windows .ico.
 * Usage: node scripts/gen-icon.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const SRC = path.resolve('apps/desktop/build/icon.svg');
const OUT = path.resolve('apps/desktop/build');
mkdirSync(OUT, { recursive: true });

const svg = readFileSync(SRC);
const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
const rendered = [];

for (const size of sizes) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size }, background: 'rgba(0,0,0,0)' });
  const png = resvg.render().asPng();
  writeFileSync(path.join(OUT, `icon-${size}.png`), png);
  rendered.push({ size, data: png });
  console.log(`✓ icon-${size}.png (${(png.length / 1024).toFixed(1)} KB)`);
}

/** ICO container with PNG-compressed entries (supported since Windows Vista). */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.data.length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

const icoSizes = new Set([16, 24, 32, 48, 64, 128, 256]);
const ico = buildIco(rendered.filter((image) => icoSizes.has(image.size)));
writeFileSync(path.join(OUT, 'icon.ico'), ico);
console.log(`✓ icon.ico (${(ico.length / 1024).toFixed(1)} KB, ${icoSizes.size} sizes)`);

// Electron on Windows also likes a 256px PNG for the window/taskbar.
writeFileSync(path.join(OUT, 'icon.png'), rendered.find((image) => image.size === 256).data);
console.log('✓ icon.png (256px)');
