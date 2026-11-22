/**
 * Security & validation checks added after the audit.
 * Usage: node scripts/audit-security.mjs [baseUrl]
 *
 * Covers: invitation email binding, logout revocation, strict document
 * validation (schema version, root node type, nesting), payload size, rate limit.
 */

const BASE = process.argv[2] ?? 'http://127.0.0.1:3001';

class Client {
  constructor() {
    this.cookies = new Map();
    this.tenantId = null;
  }
  async req(path, { method = 'GET', body, raw } = {}) {
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.tenantId) headers['x-tenant-id'] = this.tenantId;
    if (this.cookies.size) headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    const response = await fetch(`${BASE}${path}`, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
    for (const cookie of response.headers.getSetCookie?.() ?? []) {
      const pair = cookie.split(';')[0];
      const i = pair.indexOf('=');
      if (i > 0) this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    return { status: response.status, payload };
  }
  async expect(path, options, status, label) {
    const result = await this.req(path, options);
    const ok = result.status === status;
    console.log(`${ok ? '✓' : '✗'} ${label} → ${result.status}${ok ? '' : ` (expected ${status})`}`);
    if (!ok) {
      console.log('   ', JSON.stringify(result.payload).slice(0, 250));
      process.exitCode = 1;
    }
    return result.payload;
  }
}

const unique = () => Math.random().toString(36).slice(2, 8);

async function main() {
  const health = await fetch(`${BASE}/health`).then((response) => response.json());
  const singleWorkspace = health.mode === 'single-workspace';

  const demo = new Client();
  const demoMe = await demo.expect('/auth/login', { method: 'POST', body: { email: 'demo@dalmg.dev', password: 'demo12345' } }, 201, 'demo login');
  demo.tenantId = demoMe.tenants[0].id;

  /* ── invitation email binding ─────────────────────────── */
  if (singleWorkspace) {
    console.log('· single-workspace mode: invitation flow skipped (accounts disabled)');
  } else {
    const invitationEmail = `invite-${unique()}@test.dev`;
    const invitation = await demo.expect('/workspace/invitations', { method: 'POST', body: { email: invitationEmail, role: 'ADMIN' } }, 201, 'create invitation');

    const attacker = new Client();
    const attackerEmail = `attacker-${unique()}@test.dev`;
    const attackerMe = await attacker.expect('/auth/register', { method: 'POST', body: { name: 'Attacker', email: attackerEmail, password: 'password123' } }, 201, 'register other user');
    attacker.tenantId = attackerMe.tenants[0].id;
    await attacker.expect(`/tenants/invitations/${invitation.token}/accept`, { method: 'POST', body: {} }, 403, 'foreign invitation rejected');

    const invited = new Client();
    await invited.expect('/auth/register', { method: 'POST', body: { name: 'Invited', email: invitationEmail, password: 'password123' } }, 201, 'register invited user');
    await invited.expect(`/tenants/invitations/${invitation.token}/accept`, { method: 'POST', body: {} }, 201, 'own invitation accepted');
  }

  /* ── logout revokes access token ──────────────────────── */
  if (singleWorkspace) {
    console.log('· single-workspace mode: session revocation checks skipped (accounts disabled)');
  } else {
    const session = new Client();
    await session.expect('/auth/login', { method: 'POST', body: { email: 'demo@dalmg.dev', password: 'demo12345' } }, 201, 'session login');
    await session.expect('/auth/me', {}, 200, 'session valid');
    await session.expect('/auth/logout', { method: 'POST', body: {} }, 201, 'logout');
    await session.expect('/auth/me', {}, 401, 'access token revoked after logout');
  }

  /* ── strict document validation ───────────────────────── */
  const demo2 = new Client();
  const demo2Me = await demo2.expect('/auth/login', { method: 'POST', body: { email: 'demo@dalmg.dev', password: 'demo12345' } }, 201, 'demo re-login');
  demo2.tenantId = demo2Me.tenants[0].id;

  const projects = await demo2.expect('/projects', {}, 200, 'projects');
  const pages = await demo2.expect(`/projects/${projects[0].id}/pages`, {}, 200, 'pages');
  const page = await demo2.expect(`/pages/${pages[0].id}`, {}, 200, 'page');

  await demo2.expect(
    `/pages/${page.id}/draft`,
    { method: 'POST', body: { revision: page.revision, document: { schemaVersion: 99, theme: page.document.theme, sections: [] } } },
    400,
    'unsupported schemaVersion rejected',
  );

  const rootHeading = { ...page.document, sections: [{ id: 'h1', type: 'heading', props: { text: 'x' }, style: {} }] };
  await demo2.expect(`/pages/${page.id}/draft`, { method: 'POST', body: { revision: page.revision, document: rootHeading } }, 400, 'root-level non-section rejected');

  let nested = { id: 'leaf', type: 'text', props: { text: 'x' }, style: {} };
  for (let i = 0; i < 80; i += 1) nested = { id: `c${i}`, type: 'container', props: {}, style: {}, children: [nested] };
  const deep = { ...page.document, sections: [{ id: 'sec', type: 'section', props: {}, style: {}, children: [nested] }] };
  await demo2.expect(`/pages/${page.id}/draft`, { method: 'POST', body: { revision: page.revision, document: deep } }, 400, 'deep nesting rejected');

  const huge = { ...page.document, sections: [{ id: 'sec', type: 'section', props: {}, style: {}, children: [{ id: 't', type: 'text', props: { text: 'x'.repeat(4_000_000) }, style: {} }] }] };
  await demo2.expect(`/pages/${page.id}/draft`, { method: 'POST', body: { revision: page.revision, document: huge } }, 413, 'oversized payload rejected');

  /* ── rate limiting (run last: poisons counters for 60s) ─ */
  let limited = false;
  const probe = new Client();
  for (let i = 0; i < 70; i += 1) {
    const result = await probe.req('/auth/login', { method: 'POST', body: { email: 'nobody@test.dev', password: 'wrong-password' } });
    if (result.status === 429) { limited = true; break; }
  }
  console.log(`${limited ? '✓' : '✗'} auth rate limit triggers 429`);
  if (!limited) process.exitCode = 1;

  console.log(process.exitCode ? '\nAUDIT CHECKS FAILED' : '\nAUDIT CHECKS PASSED');
  console.log('Note: restart the API to clear in-memory rate-limit counters before other tests.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

