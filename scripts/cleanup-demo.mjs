/**
 * Keeps the demo workspace clean before publishing screenshots / a demo:
 * removes templates that are not part of the seeded set and projects
 * other than the demo site (subdomain "demo").
 *
 * Usage: node scripts/cleanup-demo.mjs
 */

import path from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '../packages/db/generated/client/index.js';
import { systemTemplates } from '../packages/templates/dist/index.js';

config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();
const allowed = new Set(systemTemplates.map((template) => template.slug));

const templates = await prisma.template.findMany({ select: { id: true, slug: true, name: true } });
const extraTemplates = templates.filter((template) => !allowed.has(template.slug));
for (const template of extraTemplates) {
  await prisma.template.delete({ where: { id: template.id } });
  console.log(`removed template: ${template.name} (${template.slug})`);
}

const projects = await prisma.project.findMany({ select: { id: true, name: true, subdomain: true } });
for (const project of projects) {
  if (project.subdomain !== 'demo') {
    await prisma.project.delete({ where: { id: project.id } });
    console.log(`removed project: ${project.name}`);
  }
}

console.log(`kept ${templates.length - extraTemplates.length} templates and ${projects.length - (projects.length - (projects.filter((p) => p.subdomain === 'demo').length))} demo project(s)`);
await prisma.$disconnect();
