/**
 * Deletes the seeded demo project so `npm run db:seed` can recreate it with
 * fresh template content. Only the `demo` subdomain is touched.
 *
 * Usage: node scripts/reset-demo.mjs
 */

import path from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '../packages/db/generated/client/index.js';

config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const project = await prisma.project.findUnique({ where: { subdomain: 'demo' } });
if (!project) {
  console.log('demo project not found — nothing to reset');
} else {
  await prisma.project.delete({ where: { id: project.id } });
  console.log('demo project deleted; run `npm run db:seed` to recreate it');
}

await prisma.$disconnect();
