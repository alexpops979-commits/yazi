/**
 * Creates the GitHub repository for this project using the credentials
 * already stored by Git Credential Manager. The token is never printed.
 *
 * Usage: node scripts/gh-create-repo.mjs [repoName]
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';

const REPO = process.argv[2] ?? 'yazi';
const GIT = 'C:\\Program Files\\Git\\cmd\\git.exe';

function storedCredential() {
  const output = execFileSync(GIT, ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  const map = Object.fromEntries(
    output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
  return map.password;
}

async function main() {
  const token = storedCredential();
  if (!token) {
    console.error('No GitHub credentials found. Run `git credential fill` or `gh auth login`.');
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'yazi-builder',
    Accept: 'application/vnd.github+json',
  };

  const me = await fetch('https://api.github.com/user', { headers }).then((response) => response.json());
  if (!me.login) {
    console.error('GitHub API rejected the token');
    process.exit(1);
  }

  const body = {
    name: REPO,
    description: 'Yazi — визуальный конструктор сайтов: редактор, 78 шаблонов, 1000 идей, публикация и свои домены.',
    private: false,
    has_issues: true,
    has_wiki: false,
  };

  const response = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.status === 201) {
    const repo = await response.json();
    console.log(`created ${repo.html_url}`);
  } else if (response.status === 422) {
    console.log(`repository already exists: https://github.com/${me.login}/${REPO}`);
  } else {
    const text = await response.text();
    console.error(`create failed (${response.status}): ${text.slice(0, 300)}`);
    process.exit(1);
  }

  console.log(`owner: ${me.login}`);
  console.log(`remote: https://github.com/${me.login}/${REPO}.git`);
  console.log(`local:  ${path.resolve('.')}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
