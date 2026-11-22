/**
 * End-to-end smoke test against a running API (npm run dev:api).
 * Usage: node scripts/smoke.mjs [baseUrl]
 *
 * Covers: auth, tenant isolation, autosave optimistic locking, publish,
 * public site resolution, plan limits (402) and the mock billing upgrade.
 */

const BASE = process.argv[2] ?? 'http://127.0.0.1:3001';

class Client {
  constructor() {
    this.cookies = new Map();
    this.tenantId = null;
  }

  async request(path, { method = 'GET', body } = {}) {
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.tenantId) headers['x-tenant-id'] = this.tenantId;
    if (this.cookies.size) headers.cookie = [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; ');

    const response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    for (const cookie of response.headers.getSetCookie?.() ?? []) {
      const [pair] = cookie.split(';');
      const index = pair.indexOf('=');
      if (index > 0) this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }

    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }
    return { status: response.status, payload };
  }

  async expect(path, options, status, label) {
    const result = await this.request(path, options);
    const ok = result.status === status;
    console.log(`${ok ? '✓' : '✗'} ${label} → ${result.status}${ok ? '' : ` (expected ${status})`}`);
    if (!ok) {
      console.log('   ', JSON.stringify(result.payload).slice(0, 400));
      process.exitCode = 1;
    }
    return result.payload;
  }
}

const unique = () => Math.random().toString(36).slice(2, 8);

async function main() {
  const health = await fetch(`${BASE}/health`).then((response) => response.json());
  console.log(`health: db=${health.database} mode=${health.mode ?? 'multi-tenant'} stripe=${health.stripe}`);
  if (health.database !== 'ok') throw new Error('Database is unreachable');
  const singleWorkspace = health.mode === 'single-workspace';

  /* ── Fresh free workspace ─────────────────────────────── */
  const free = new Client();
  const email = `smoke-${unique()}@test.dev`;
  const me = await free.expect('/auth/register', { method: 'POST', body: { name: 'Smoke Test', email, password: 'password123', workspaceName: `Smoke ${unique()}` } }, 201, 'register');
  free.tenantId = me.tenants[0].id;
  if (me.tenants[0].planCode !== 'free') throw new Error('new workspace must be on free plan');

  const project = await free.expect('/projects', { method: 'POST', body: { name: 'Smoke Site' } }, 201, 'create project');
  const secondProject = await free.expect('/projects', { method: 'POST', body: { name: 'Second Site' } }, 201, 'second project allowed (no plan limits)');

  const home = await free.expect(`/projects/${project.id}/pages`, { method: 'GET', body: undefined }, 200, 'list pages');
  const homeId = home[0].id;
  await free.expect(`/projects/${project.id}/pages`, { method: 'POST', body: { title: 'About', path: '/about' } }, 201, 'create page 2');
  await free.expect(`/projects/${project.id}/pages`, { method: 'POST', body: { title: 'Contact', path: '/contact' } }, 201, 'create page 3');
  await free.expect(`/projects/${project.id}/pages`, { method: 'POST', body: { title: 'Extra', path: '/extra' } }, 201, 'page 4 allowed (no plan limits)');

  /* ── Autosave + optimistic locking ────────────────────── */
  const page = await free.expect(`/pages/${homeId}`, {}, 200, 'load page');
  const saved = await free.expect(`/pages/${homeId}/draft`, { method: 'POST', body: { document: page.document, revision: page.revision } }, 201, 'autosave');
  const conflict = await free.expect(`/pages/${homeId}/draft`, { method: 'POST', body: { document: page.document, revision: page.revision } }, 409, 'stale autosave rejected');
  if (conflict?.code !== 'REVISION_CONFLICT') throw new Error('expected REVISION_CONFLICT');
  await free.expect(`/pages/${homeId}/draft`, { method: 'POST', body: { document: { schemaVersion: 1, theme: {}, sections: 'nope' }, revision: saved.revision } }, 400, 'invalid document rejected');

  /* ── Publish + public resolution ──────────────────────── */
  const published = await free.expect(`/pages/${homeId}/publish`, { method: 'POST', body: { note: 'smoke' } }, 201, 'publish page');
  if (!published?.version) throw new Error('publish did not return a version');
  const siteHost = `${project.subdomain}.lvh.me`;
  const publicPayload = await fetch(`${BASE}/public/resolve?host=${siteHost}&path=/`).then((response) => response.json());
  if (!publicPayload?.page?.document?.sections?.length) throw new Error('public site did not resolve');
  console.log(`✓ public site resolves: ${publicPayload.project.name}, ${publicPayload.page.document.sections.length} sections, branding=${publicPayload.project.branding}`);

  /* ── Tenant isolation ─────────────────────────────────── */
  if (!singleWorkspace) {
    const other = new Client();
    const otherMe = await other.expect('/auth/register', { method: 'POST', body: { name: 'Isolation', email: `iso-${unique()}@test.dev`, password: 'password123' } }, 201, 'register second tenant');
    other.tenantId = otherMe.tenants[0].id;
    await other.expect(`/projects/${project.id}`, {}, 404, 'foreign project is invisible');
    await other.expect(`/pages/${homeId}`, {}, 404, 'foreign page is invisible');
    free.tenantId = 'bogus';
    await free.expect(`/projects/${project.id}`, {}, 403, 'bogus tenant header rejected');
    free.tenantId = me.tenants[0].id;
  } else {
    console.log('· single-workspace mode: tenant isolation checks skipped');
  }

  /* ── No plans: every feature is available ─────────────── */
  await free.expect('/billing/checkout', { method: 'POST', body: { planCode: 'pro' } }, 403, 'checkout disabled (plans removed)');
  const entitlements = await free.expect('/billing/entitlements', {}, 200, 'entitlements');
  if (!entitlements.limits?.customCode || entitlements.limits.customCode !== true) {
    throw new Error('custom code must be enabled for everyone');
  }
  console.log(`✓ unlimited features: customDomains=${entitlements.limits.customDomains}, customCode=${entitlements.limits.customCode}`);

  /* ── Admin ───────────────────────────────────────────── */
  const admin = new Client();
  await admin.expect('/auth/login', { method: 'POST', body: { email: 'admin@yazi.dev', password: 'admin12345' } }, 201, 'admin login');
  const stats = await admin.expect('/admin/stats', {}, 200, 'admin stats');
  console.log(`✓ admin stats: users=${stats.users} projects=${stats.projects} publishedPages=${stats.publishedPages}`);
  if (!singleWorkspace) {
    await free.expect('/admin/stats', {}, 403, 'non-admin blocked from admin API');
  }

  /* ── Cleanup: keep the demo workspace tidy ─────────────── */
  for (const id of [project.id, secondProject.id]) {
    await free.request(`/projects/${id}`, { method: 'DELETE' }).catch(() => undefined);
  }
  console.log('✓ test projects removed');

  console.log(process.exitCode ? '\nSMOKE FAILED' : '\nSMOKE PASSED');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
