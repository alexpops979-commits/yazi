/**
 * Publishes the built desktop artifacts to GitHub Releases.
 * Usage: node scripts/gh-release.mjs
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const GIT = 'C:\\Program Files\\Git\\cmd\\git.exe';
const OWNER = 'alexpops979-commits';
const REPO = 'yazi';
const TAG = 'v1.0.0';

const assets = [
  path.resolve('apps/desktop/release/Yazi-Setup-1.0.0.exe'),
  path.resolve('apps/desktop/release/Yazi-portable-1.0.0.zip'),
];

const notes = `## Yazi 1.0.0

Первый публичный релиз конструктора сайтов.

- визуальный редактор: блоки, drag-and-drop, слои, инспектор, тема;
- 78 шаблонов и каталог из 1000 идей для GitHub;
- публикация на поддомены и свои домены, SEO, sitemap/robots;
- версии, автосохранение, предпросмотр;
- светлая и тёмная темы;
- без аккаунтов: приложение открывается сразу в рабочем пространстве.

**Windows:** \`Yazi-Setup-1.0.0.exe\` — установщик (ярлыки на рабочем столе и в «Пуск»),
\`Yazi-portable-1.0.0.zip\` — portable-версия.

Установщик не подписан сертификатом: SmartScreen может показать «Неизвестный издатель».
Для работы нужен сервер приложения (локальный \`npm run dev\` или развёрнутый экземпляр).`;

const output = execFileSync(GIT, ['credential', 'fill'], {
  input: 'protocol=https\nhost=github.com\n\n',
  encoding: 'utf8',
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
});
const token = output
  .split('\n')
  .find((line) => line.startsWith('password='))
  ?.slice('password='.length);

if (!token) {
  console.error('No GitHub credentials found');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'yazi-builder',
};

async function getRelease() {
  const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/${TAG}`, { headers });
  return response.ok ? response.json() : null;
}

async function main() {
  let release = await getRelease();

  if (!release) {
    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        tag_name: TAG,
        target_commitish: 'main',
        name: `Yazi ${TAG}`,
        body: notes,
        draft: false,
        prerelease: false,
      }),
    });
    if (!response.ok) {
      console.error(`release create failed: ${response.status} ${(await response.text()).slice(0, 300)}`);
      process.exit(1);
    }
    release = await response.json();
    console.log(`release created: ${release.html_url}`);
  } else {
    console.log(`release exists: ${release.html_url}`);
  }

  const existing = new Map((release.assets ?? []).map((asset) => [asset.name, asset]));

  for (const file of assets) {
    const name = path.basename(file);
    if (existing.has(name) && existing.get(name).size === statSync(file).size) {
      console.log(`skip existing: ${name}`);
      continue;
    }

    const data = readFileSync(file);
    const uploadUrl = `${release.upload_url.replace('{?name,label}', '')}?name=${encodeURIComponent(name)}`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/octet-stream', 'Content-Length': String(data.length) },
      body: data,
    });
    if (!response.ok) {
      console.error(`upload failed ${name}: ${response.status} ${(await response.text()).slice(0, 200)}`);
      process.exitCode = 1;
      continue;
    }
    const asset = await response.json();
    console.log(`uploaded ${name} (${(asset.size / (1024 * 1024)).toFixed(1)} MB) → ${asset.browser_download_url}`);
  }

  console.log(`\nrelease page: ${release.html_url}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
