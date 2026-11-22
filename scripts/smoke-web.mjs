/**
 * Web smoke test: published site SSR, preview, dashboard shell, sitemap.
 * Requires: API on :3001, web on :3002, seeded DB.
 * Usage: node scripts/smoke-web.mjs [webPort]
 */

import http from 'node:http';

const WEB_PORT = Number(process.argv[2] ?? 3002);
const API = 'http://127.0.0.1:3001';

function get(path, host) {
  return new Promise((resolve, reject) => {
    const request = http.get(
      { host: '127.0.0.1', port: WEB_PORT, path, headers: { host } },
      (response) => {
        let data = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => (data += chunk));
        response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: data }));
      },
    );
    request.on('error', reject);
    request.setTimeout(20000, () => request.destroy(new Error('timeout')));
  });
}

function check(label, condition, extra = '') {
  console.log(`${condition ? '✓' : '✗'} ${label}${condition ? '' : ` ${extra}`}`);
  if (!condition) process.exitCode = 1;
}

async function login() {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'demo@dalmg.dev', password: 'demo12345' }),
  });
  if (!response.ok) throw new Error(`login failed: ${response.status}`);
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(';')[0]).join('; ');
  const me = await response.json();
  return { cookies, tenantId: me.tenants[0].id };
}

async function main() {
  const loginRedirect = await get('/login', 'localhost:3002');
  check('login redirects to the app', loginRedirect.status === 307 && loginRedirect.headers.location === '/projects');

  const registerRedirect = await get('/register', 'localhost:3002');
  check('register redirects to the app', registerRedirect.status === 307 && registerRedirect.headers.location === '/projects');

  const dashboard = await get('/projects', 'localhost:3002');
  check('dashboard shell renders', dashboard.status === 200);

  const site = await get('/', 'demo.lvh.me:3002');
  check('published site responds', site.status === 200, `status=${site.status}`);
  check('site contains project content', site.body.includes('Meridian'));
  check('site injects container-query CSS', site.body.includes('@container pb-root'));
  check('site has SEO title', /<title>[^<]*Meridian/i.test(site.body));
  check('site has fonts stylesheet', site.body.includes('fonts.googleapis.com'));

  const about = await get('/about', 'demo.lvh.me:3002');
  check('second page resolves', about.status === 200 && about.body.includes('Larsen'));

  const missing = await get('/does-not-exist', 'demo.lvh.me:3002');
  check('unknown path returns 404', missing.status === 404, `status=${missing.status}`);

  const unknownHost = await get('/', 'unknown.lvh.me:3002');
  check('unknown host returns 404', unknownHost.status === 404, `status=${unknownHost.status}`);

  const sitemap = await get('/sitemap.xml', 'demo.lvh.me:3002');
  check('sitemap.xml generated', sitemap.status === 200 && sitemap.body.includes('<urlset'));

  const robots = await get('/robots.txt', 'demo.lvh.me:3002');
  check('robots.txt generated', robots.status === 200 && robots.body.includes('Sitemap:'));

  /* ── Preview of the draft ─────────────────────────────── */
  const { cookies, tenantId } = await login();
  const projects = await fetch(`${API}/projects`, { headers: { cookie: cookies, 'x-tenant-id': tenantId } }).then((r) => r.json());
  // Audit/test runs may add projects to the demo workspace: target the seeded site explicitly.
  const project = projects.find((item) => item.subdomain === 'demo') ?? projects[0];
  const pages = await fetch(`${API}/projects/${project.id}/pages`, { headers: { cookie: cookies, 'x-tenant-id': tenantId } }).then((r) => r.json());
  const homePage = pages.find((item) => item.path === '/') ?? pages[0];
  const token = await fetch(`${API}/pages/${homePage.id}/preview-token`, {
    method: 'POST',
    headers: { cookie: cookies, 'x-tenant-id': tenantId, 'content-type': 'application/json' },
    body: '{}',
  }).then((r) => r.json());

  const preview = await get(`/preview/${token.token}`, 'localhost:3002');
  check('preview renders with noindex', preview.status === 200 && preview.body.includes('noindex'));
  check('preview contains page content', preview.body.includes('Empowering your business'));

  console.log(process.exitCode ? '\nWEB SMOKE FAILED' : '\nWEB SMOKE PASSED');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
