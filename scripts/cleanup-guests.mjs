/**
 * Removes demo workspaces created by the "guest" login (no registration).
 * Use before publishing a demo or on a schedule.
 *
 * Usage: node scripts/cleanup-guests.mjs
 */

import path from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '../packages/db/generated/client/index.js';

config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const guests = await prisma.user.findMany({
  where: { email: { startsWith: 'guest-' } },
  select: { id: true, memberships: { select: { tenantId: true } } },
});

const tenantIds = [...new Set(guests.flatMap((guest) => guest.memberships.map((membership) => membership.tenantId)))];

if (!guests.length) {
  console.log('no guest accounts found');
} else {
  await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  await prisma.user.deleteMany({ where: { id: { in: guests.map((guest) => guest.id) } } });
  console.log(`removed ${guests.length} guest account(s) and ${tenantIds.length} demo workspace(s)`);
}

await prisma.$disconnect();
