/**
 * Updates repository metadata (description/homepage) using stored git credentials.
 * Usage: node scripts/gh-update-repo.mjs
 */

import { execFileSync } from 'node:child_process';

const GIT = 'C:\\Program Files\\Git\\cmd\\git.exe';
const OWNER = 'alexpops979-commits';
const REPO = 'yazi';

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

const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'yazi-builder',
    'Content-Type': 'application/json; charset=utf-8',
  },
  body: JSON.stringify({
    description: 'Yazi — визуальный конструктор сайтов: редактор, 78 шаблонов, 1000 идей, публикация и свои домены.',
    homepage: '',
  }),
});

if (!response.ok) {
  console.error(`failed: ${response.status} ${(await response.text()).slice(0, 200)}`);
  process.exit(1);
}

const repo = await response.json();
console.log(`updated: ${repo.html_url}`);
console.log(`description: ${repo.description}`);
