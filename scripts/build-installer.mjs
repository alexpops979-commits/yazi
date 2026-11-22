/**
 * Compiles the NSIS installer from the already-packed portable build.
 * NSIS itself is downloaded once into apps/desktop/.nsis (see README).
 *
 *   node scripts/build-installer.mjs
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const makensis = path.join(root, 'apps', 'desktop', '.nsis', 'makensis.exe');
const buildDir = path.join(root, 'apps', 'desktop', 'build');
const portableExe = path.join(root, 'apps', 'desktop', 'release', 'Dalmg-win-x64', 'Dalmg.exe');

if (!existsSync(portableExe)) {
  console.error('Portable build missing. Run: npm run desktop:pack');
  process.exit(1);
}

if (!existsSync(makensis)) {
  console.error('NSIS not found at apps/desktop/.nsis/makensis.exe');
  console.error('Download nsis-3.0.4.1.7z and 7zr.exe, extract into apps/desktop/.nsis, then retry.');
  console.error('(electron-builder\'s `npm run desktop:dist` is an alternative, but it needs app-builder.exe,');
  console.error(' which Kaspersky may block unless the project folder is in its exclusions.)');
  process.exit(1);
}

console.log('• compiling installer (NSIS)');
execFileSync(makensis, ['/V2', 'installer.nsi'], { cwd: buildDir, stdio: 'inherit' });

const out = path.join(root, 'apps', 'desktop', 'release', 'Dalmg-Setup-1.0.0.exe');
console.log(existsSync(out) ? `\n✓ Installer ready: ${out}` : '\n! Installer was not produced');
