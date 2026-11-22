/**
 * Builds a runnable portable Windows app without electron-builder
 * (works even when security software blocks app-builder.exe).
 *
 *   node scripts/pack-desktop.mjs
 *
 * Output:
 *   apps/desktop/release/Yazi-win-x64/Yazi.exe
 *   apps/desktop/release/Yazi-portable-<version>.zip
 */

import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const appDir = path.join(root, 'apps', 'desktop');
const electronDist = path.join(appDir, '.electron-dist');
const pkg = JSON.parse(readFileSync(path.join(appDir, 'package.json'), 'utf8'));
const outDir = path.join(appDir, 'release', 'Yazi-win-x64');

if (!existsSync(path.join(electronDist, 'electron.exe'))) {
  console.error('Electron runtime not found. Expected apps/desktop/.electron-dist/electron.exe');
  process.exit(1);
}

console.log('• cleaning', outDir);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

console.log('• copying Electron runtime');
cpSync(electronDist, outDir, { recursive: true });

const exePath = path.join(outDir, 'Yazi.exe');
renameSync(path.join(outDir, 'electron.exe'), exePath);

const resourcesApp = path.join(outDir, 'resources', 'app');
rmSync(path.join(outDir, 'resources', 'default_app.asar'), { force: true });
mkdirSync(resourcesApp, { recursive: true });

console.log('• copying application code');
cpSync(path.join(appDir, 'src'), path.join(resourcesApp, 'src'), { recursive: true });
cpSync(path.join(appDir, 'build'), path.join(resourcesApp, 'build'), { recursive: true });

const appPkg = {
  name: 'yazi',
  productName: 'Yazi',
  version: pkg.version,
  description: pkg.description,
  author: pkg.author,
  main: 'src/main.js',
};
writeFileSync(path.join(resourcesApp, 'package.json'), JSON.stringify(appPkg, null, 2), 'utf8');

/* Windows shortcuts with the branded icon (the exe keeps Electron's embedded icon,
   the shortcut/taskbar/window icon comes from build/icon.ico). */
const ico = path.join(outDir, 'resources', 'app', 'build', 'icon.ico');
const shortcut = path.join(outDir, 'Yazi.lnk');
try {
  const ps = [
    '$ws = New-Object -ComObject WScript.Shell;',
    `$s = $ws.CreateShortcut('${shortcut.replace(/'/g, "''")}');`,
    `$s.TargetPath = '${exePath.replace(/'/g, "''")}';`,
    `$s.WorkingDirectory = '${outDir.replace(/'/g, "''")}';`,
    `$s.IconLocation = '${ico.replace(/'/g, "''")}';`,
    '$s.Description = "Yazi — конструктор сайтов";',
    '$s.Save();',
  ].join(' ');
  execFileSync('powershell', ['-NoProfile', '-Command', ps], { windowsHide: true });
  console.log('• shortcut created');
} catch (error) {
  console.warn('! shortcut creation skipped:', error instanceof Error ? error.message : error);
}

/* Optional: replace the icon embedded in Yazi.exe (requires rcedit). */
const rceditCandidates = [
  path.join(root, 'node_modules', 'rcedit', 'bin', 'rcedit-x64.exe'),
  path.join(root, 'node_modules', 'rcedit', 'bin', 'rcedit.exe'),
];
const rcedit = rceditCandidates.find((candidate) => existsSync(candidate));
if (existsSync(rcedit)) {
  try {
    execFileSync(
      rcedit,
      [
        exePath,
        '--set-icon',
        ico,
        '--set-file-version',
        pkg.version,
        '--set-product-version',
        pkg.version,
        '--set-version-string',
        'ProductName',
        'Yazi',
        '--set-version-string',
        'FileDescription',
        'Yazi — конструктор сайтов',
        '--set-version-string',
        'CompanyName',
        'Yazi',
        '--set-version-string',
        'LegalCopyright',
        '© 2026 Yazi',
      ],
      { windowsHide: true, stdio: 'ignore' },
    );
    console.log('• exe icon and version info updated');
  } catch (error) {
    console.warn('! rcedit skipped:', error instanceof Error ? error.message : error);
  }
} else {
  console.log('• rcedit not installed — exe icon stays default (shortcut icon is branded)');
}

const zipPath = path.join(appDir, 'release', `Yazi-portable-${pkg.version}.zip`);
rmSync(zipPath, { force: true });
console.log('• packing zip');
execFileSync(
  'powershell',
  ['-NoProfile', '-Command', `Compress-Archive -Path '${outDir}' -DestinationPath '${zipPath}' -CompressionLevel Optimal`],
  { windowsHide: true, stdio: 'ignore' },
);

const mb = (file) => `${(statSync(file).size / (1024 * 1024)).toFixed(1)} MB`;
console.log('');
console.log('✓ Portable build ready');
console.log('  exe:', exePath);
console.log('  zip:', zipPath, mb(zipPath));
console.log('');
console.log('Installer: after adding the project folder to Kaspersky exclusions run');
console.log('  npm run desktop:dist');
