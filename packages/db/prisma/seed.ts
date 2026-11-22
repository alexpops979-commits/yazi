import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { DEFAULT_LIMITS, type PlanCode } from '@yazi/contracts';
import { migrateDocument } from '@yazi/page-schema';
import { systemTemplates } from '@yazi/templates';
import { hashPassword, prismaRaw as prisma } from '../src';

loadEnv({ path: path.resolve(process.cwd(), '../../.env') });
loadEnv();

const siteDomain = (process.env.SITE_DOMAIN ?? 'lvh.me:3002').split(':')[0];
const siteDomainRaw = process.env.SITE_DOMAIN ?? 'lvh.me:3002';

async function seedPlans() {
  const plans = [
    {
      code: 'free',
      name: 'Free',
      description: 'One project, builder branding, no custom domain.',
      priceCents: 0,
      stripePriceId: null as string | null,
      limits: DEFAULT_LIMITS.free,
      sortIndex: 0,
    },
    {
      code: 'pro',
      name: 'Pro',
      description: 'Ten projects, custom domains, version history, no branding.',
      priceCents: 1900,
      stripePriceId: process.env.STRIPE_PRICE_PRO || null,
      limits: DEFAULT_LIMITS.pro,
      sortIndex: 1,
    },
    {
      code: 'business',
      name: 'Business',
      description: 'Unlimited-ish projects, 25 domains, custom code, priority support.',
      priceCents: 4900,
      stripePriceId: process.env.STRIPE_PRICE_BUSINESS || null,
      limits: DEFAULT_LIMITS.business,
      sortIndex: 2,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      create: plan,
      update: {
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        limits: plan.limits,
        sortIndex: plan.sortIndex,
        ...(plan.stripePriceId ? { stripePriceId: plan.stripePriceId } : {}),
      },
    });
  }
  console.log(`✓ plans: ${plans.map((p) => p.code).join(', ')}`);
}

async function seedTemplates() {
  for (const [index, template] of systemTemplates.entries()) {
    const document = migrateDocument(template.document);
    await prisma.template.upsert({
      where: { slug: template.slug },
      create: {
        slug: template.slug,
        name: template.name,
        category: template.category,
        description: template.description,
        thumbnailUrl: template.thumbnailUrl,
        document: document as never,
        isSystem: true,
        isPublished: true,
        sortIndex: index,
      },
      update: {
        name: template.name,
        category: template.category,
        description: template.description,
        thumbnailUrl: template.thumbnailUrl,
        document: document as never,
        isSystem: true,
        isPublished: true,
        sortIndex: index,
      },
    });
  }
  console.log(`✓ templates: ${systemTemplates.length}`);
}

async function ensureWorkspace(params: {
  email: string;
  password: string;
  name: string;
  workspaceName: string;
  workspaceSlug: string;
  role: 'OWNER' | 'SUPER_ADMIN';
  planCode: PlanCode;
}) {
  const passwordHash = await hashPassword(params.password);
  const user = await prisma.user.upsert({
    where: { email: params.email },
    create: {
      email: params.email,
      name: params.name,
      passwordHash,
      role: params.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'USER',
      emailVerifiedAt: new Date(),
    },
    update: { role: params.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'USER' },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: params.workspaceSlug },
    create: { name: params.workspaceName, slug: params.workspaceSlug, planCode: params.planCode },
    update: { planCode: params.planCode },
  });

  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    create: { tenantId: tenant.id, userId: user.id, role: 'OWNER' },
    update: { role: 'OWNER' },
  });

  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    create: { tenantId: tenant.id, planCode: params.planCode, status: 'ACTIVE' },
    update: { planCode: params.planCode },
  });

  return { user, tenant };
}

async function seedDemoSite(tenantId: string, ownerId: string) {
  const template = systemTemplates.find((t) => t.slug === 'meridian-consulting')!;
  const homeDoc = migrateDocument(template.document);
  const aboutDoc = migrateDocument(systemTemplates.find((t) => t.slug === 'dr-larsen')!.document);

  const project = await prisma.project.upsert({
    where: { subdomain: 'demo' },
    create: {
      tenantId,
      name: 'Meridian Consulting',
      subdomain: 'demo',
      status: 'PUBLISHED',
      theme: homeDoc.theme as never,
      seo: {
        title: 'Meridian Consulting — strategy that ships',
        description: 'Senior consulting for mid-market teams. Positioning, operating model, reporting.',
      } as never,
      publishedAt: new Date(),
    },
    update: { status: 'PUBLISHED' },
  });

  const host = `demo.${siteDomain}`;
  await prisma.projectDomain.upsert({
    where: { host },
    create: {
      tenantId,
      projectId: project.id,
      host,
      kind: 'SUBDOMAIN',
      status: 'VERIFIED',
      verificationToken: 'seed',
      verifiedAt: new Date(),
      isPrimary: true,
    },
    update: { status: 'VERIFIED', verifiedAt: new Date(), isPrimary: true },
  });

  const pages: { title: string; path: string; doc: ReturnType<typeof migrateDocument> }[] = [
    { title: 'Home', path: '/', doc: homeDoc },
    { title: 'About', path: '/about', doc: aboutDoc },
  ];

  for (const [index, pageSeed] of pages.entries()) {
    const page = await prisma.page.upsert({
      where: { projectId_path: { projectId: project.id, path: pageSeed.path } },
      create: {
        tenantId,
        projectId: project.id,
        title: pageSeed.title,
        path: pageSeed.path,
        seo: {} as never,
        sortIndex: index,
        draftDocument: pageSeed.doc as never,
        draftRevision: 1,
      },
      update: {},
    });

    const existingVersion = await prisma.pageVersion.findUnique({
      where: { pageId_version: { pageId: page.id, version: 1 } },
    });
    const version =
      existingVersion ??
      (await prisma.pageVersion.create({
        data: {
          tenantId,
          pageId: page.id,
          version: 1,
          document: pageSeed.doc as never,
          note: 'Initial publish',
          createdById: ownerId,
        },
      }));

    await prisma.page.update({
      where: { id: page.id },
      data: {
        status: 'PUBLISHED',
        publishedVersionId: version.id,
        publishedAt: new Date(),
        publishedRevision: 1,
      },
    });

    const events = await prisma.publishEvent.count({ where: { pageId: page.id } });
    if (events === 0) {
      await prisma.publishEvent.create({
        data: { tenantId, projectId: project.id, pageId: page.id, versionId: version.id, actorId: ownerId },
      });
    }
  }

  console.log(`✓ demo site: http://${host}:${siteDomainRaw.split(':')[1] ?? '3002'}`);
}

async function main() {
  await seedPlans();
  await seedTemplates();

  const admin = await ensureWorkspace({
    email: process.env.ADMIN_EMAIL ?? 'admin@yazi.dev',
    password: process.env.ADMIN_PASSWORD ?? 'admin12345',
    name: 'Platform Admin',
    workspaceName: 'Yazi HQ',
    workspaceSlug: 'yazi-hq',
    role: 'SUPER_ADMIN',
    planCode: 'business',
  });

  const demo = await ensureWorkspace({
    email: process.env.DEMO_EMAIL ?? 'demo@yazi.dev',
    password: process.env.DEMO_PASSWORD ?? 'demo12345',
    name: 'Demo Designer',
    workspaceName: 'Demo Studio',
    workspaceSlug: 'demo-studio',
    role: 'OWNER',
    planCode: 'pro',
  });

  await seedDemoSite(demo.tenant.id, demo.user.id);

  console.log('\nSeed complete:');
  console.log(`  admin: ${process.env.ADMIN_EMAIL ?? 'admin@yazi.dev'} / ${process.env.ADMIN_PASSWORD ?? 'admin12345'}`);
  console.log(`  demo:  ${process.env.DEMO_EMAIL ?? 'demo@yazi.dev'} / ${process.env.DEMO_PASSWORD ?? 'demo12345'}`);
  console.log(`  admin workspace: ${admin.tenant.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
