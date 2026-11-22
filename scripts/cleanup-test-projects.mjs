/**
 * Removes projects created by smoke/audit runs (names like "Probe", "Audit", "Smoke").
 * Keeps the seeded demo site (subdomain "demo").
 *
 * Usage: node scripts/cleanup-test-projects.mjs
 */

import path from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '../packages/db/generated/client/index.js';

config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();
const pattern = /probe|audit|smoke|isolation|noauth|second site|test site/i;

const projects = await prisma.project.findMany({ select: { id: true, name: true, subdomain: true } });
const doomed = projects.filter((project) => project.subdomain !== 'demo' && pattern.test(project.name));

if (!doomed.length) {
  console.log('no test projects found');
} else {
  for (const project of doomed) {
    await prisma.project.delete({ where: { id: project.id } });
    console.log(`removed: ${project.name} (${project.subdomain})`);
  }
}

await prisma.$disconnect();
