import { Injectable } from '@nestjs/common';
import { migrateDocument } from '@yazi/page-schema';
import { DEFAULT_LIMITS, UNLIMITED_LIMITS, type PlanLimits, type PublicSitePayload, type Seo } from '@yazi/contracts';
import { PrismaService } from '../../common/prisma.service';
import { SiteCacheService } from '../../common/site-cache.service';
import { verifyPreviewToken } from '../../common/crypto';
import { env } from '../../env';

type ProjectRow = {
  id: string;
  tenantId: string;
  name: string;
  subdomain: string;
  theme: unknown;
  seo: unknown;
  faviconUrl: string | null;
  customCode: string | null;
};

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteCache: SiteCacheService,
  ) {}

  normalizeHost(input: string): string {
    return input.toLowerCase().split(':')[0]!.replace(/\.$/, '').replace(/^www\./, '');
  }

  normalizePath(input: string | undefined): string {
    if (!input) return '/';
    let path = decodeURIComponent(input).toLowerCase();
    if (!path.startsWith('/')) path = `/${path}`;
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return path.replace(/\/{2,}/g, '/');
  }

  async resolve(hostRaw: string, pathRaw: string | undefined): Promise<PublicSitePayload | null> {
    const host = this.normalizeHost(hostRaw);
    const path = this.normalizePath(pathRaw);

    const project = await this.findProject(host);
    if (!project) return null;

    const version = await this.siteCache.version(project.id);
    const cached = await this.siteCache.get<PublicSitePayload>(host, path, version);
    if (cached) return cached;

    const page = await this.prisma.raw.page.findFirst({
      where: { projectId: project.id, path, status: 'PUBLISHED', publishedVersionId: { not: null } },
      include: { publishedVersion: true },
    });
    if (!page || !page.publishedVersion) return null;

    const document = migrateDocument(page.publishedVersion.document);
    const limits = await this.limitsFor(project.tenantId);
    const pages = await this.prisma.raw.page.findMany({
      where: { projectId: project.id, status: 'PUBLISHED' },
      select: { path: true, title: true },
      orderBy: { sortIndex: 'asc' },
    });

    const payload: PublicSitePayload = {
      project: {
        id: project.id,
        name: project.name,
        subdomain: project.subdomain,
        faviconUrl: project.faviconUrl,
        theme: document.theme,
        seo: (project.seo as Seo) ?? {},
        branding: !limits.removeBranding,
        customCode: limits.customCode ? project.customCode : null,
      },
      page: {
        id: page.id,
        path: page.path,
        title: page.title,
        seo: (page.seo as Seo) ?? {},
        document,
        publishedVersion: page.publishedVersion.version,
        updatedAt: page.publishedVersion.createdAt.toISOString(),
      },
      pages,
    };

    await this.siteCache.set(host, path, version, payload);
    return payload;
  }

  async preview(token: string | undefined) {
    const claims = verifyPreviewToken(token);
    if (!claims) return null;
    const page = await this.prisma.raw.page.findUnique({ where: { id: claims.pageId } });
    if (!page) return null;
    const project = await this.prisma.raw.project.findUnique({ where: { id: page.projectId } });
    if (!project) return null;

    const document = migrateDocument(page.draftDocument);
    return {
      project: {
        id: project.id,
        name: project.name,
        theme: document.theme,
        seo: (project.seo as Seo) ?? {},
        faviconUrl: project.faviconUrl,
      },
      page: {
        id: page.id,
        title: page.title,
        path: page.path,
        seo: (page.seo as Seo) ?? {},
        document,
        revision: page.draftRevision,
      },
    };
  }

  async sitemap(hostRaw: string): Promise<string | null> {
    const host = this.normalizeHost(hostRaw);
    const project = await this.findProject(host);
    if (!project) return null;
    const pages = await this.prisma.raw.page.findMany({
      where: { projectId: project.id, status: 'PUBLISHED' },
      select: { path: true, updatedAt: true },
      orderBy: { sortIndex: 'asc' },
    });
    const scheme = env.isProd ? 'https' : 'http';
    const urls = pages
      .map(
        (page) =>
          `  <url><loc>${scheme}://${host}${page.path === '/' ? '' : page.path}</loc><lastmod>${page.updatedAt.toISOString().slice(0, 10)}</lastmod></url>`,
      )
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  }

  async robots(hostRaw: string): Promise<string> {
    const host = this.normalizeHost(hostRaw);
    const scheme = env.isProd ? 'https' : 'http';
    return `User-agent: *\nAllow: /\n\nSitemap: ${scheme}://${host}/sitemap.xml\n`;
  }

  async trackPageView(hostRaw: string, pathRaw: string | undefined): Promise<{ ok: boolean }> {
    const host = this.normalizeHost(hostRaw);
    const project = await this.findProject(host);
    if (!project) return { ok: false };
    const path = this.normalizePath(pathRaw);
    const page = await this.prisma.raw.page.findFirst({
      where: { projectId: project.id, path, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!page) return { ok: false };

    const now = new Date();
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    await this.prisma.raw.pageViewDaily.upsert({
      where: { pageId_date: { pageId: page.id, date } },
      create: { tenantId: project.tenantId, projectId: project.id, pageId: page.id, date, count: 1 },
      update: { count: { increment: 1 } },
    });
    return { ok: true };
  }

  private async findProject(host: string): Promise<ProjectRow | null> {
    const domain = await this.prisma.raw.projectDomain.findUnique({ where: { host } });
    if (domain && domain.status === 'VERIFIED') {
      return this.prisma.raw.project.findUnique({ where: { id: domain.projectId } });
    }

    if (host === env.siteDomainHost) return null;
    if (host.endsWith(`.${env.siteDomainHost}`)) {
      const subdomain = host.slice(0, -(env.siteDomainHost.length + 1));
      if (!subdomain || subdomain.includes('.')) return null;
      return this.prisma.raw.project.findUnique({ where: { subdomain } });
    }
    return null;
  }

  private async limitsFor(tenantId: string): Promise<PlanLimits> {
    if (!env.plansEnforced) return UNLIMITED_LIMITS;
    const tenant = await this.prisma.raw.tenant.findUnique({ where: { id: tenantId }, select: { planCode: true } });
    const plan = await this.prisma.raw.plan.findUnique({ where: { code: tenant?.planCode ?? 'free' } });
    return (plan?.limits as PlanLimits | undefined) ?? DEFAULT_LIMITS.free;
  }
}
