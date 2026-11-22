import { Injectable } from '@nestjs/common';
import { blankDocument, migrateDocument, type PageDocument } from '@yazi/page-schema';
import { RESERVED_SUBDOMAINS, type CreateProjectInput, type ProjectSummary, type Seo, type UpdateProjectInput } from '@yazi/contracts';
import { PrismaService } from '../../common/prisma.service';
import { EntitlementsService } from '../../common/entitlements.service';
import { TemplatesService } from '../templates/templates.service';
import { SiteCacheService } from '../../common/site-cache.service';
import { AuditService } from '../../common/audit.service';
import { ConflictException, NotFoundException } from '../../common/errors';
import { randomSuffix, slugify } from '../../common/crypto';
import { env } from '../../env';
import { PagesService } from '../pages/pages.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly templates: TemplatesService,
    private readonly pages: PagesService,
    private readonly siteCache: SiteCacheService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string): Promise<ProjectSummary[]> {
    const projects = await this.prisma.db.project.findMany({
      where: { status: { not: 'ARCHIVED' } },
      include: {
        domains: true,
        pages: { select: { status: true, draftRevision: true, publishedRevision: true, updatedAt: true, publishedAt: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return projects.map((project) => this.toSummary(project));
  }

  async get(projectId: string): Promise<ProjectSummary> {
    const project = await this.prisma.db.project.findFirst({
      where: { id: projectId },
      include: {
        domains: true,
        pages: { select: { status: true, draftRevision: true, publishedRevision: true, updatedAt: true, publishedAt: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return this.toSummary(project);
  }

  async create(tenantId: string, userId: string, input: CreateProjectInput): Promise<ProjectSummary> {
    await this.entitlements.assert(tenantId, 'projects', 1);

    const document = await this.resolveDocument(tenantId, input.templateId);
    const subdomain = await this.uniqueSubdomain(input.subdomain || slugify(input.name, 'site'));

    const project = await this.prisma.db.project.create({
      data: {
        tenantId,
        name: input.name,
        subdomain,
        theme: document.theme as never,
        seo: {
          title: input.name,
          description: '',
        } as never,
      },
    });

    await this.prisma.db.page.create({
      data: {
        tenantId,
        projectId: project.id,
        title: 'Home',
        path: '/',
        seo: {} as never,
        draftDocument: document as never,
        draftRevision: 1,
      },
    });

    await this.audit.record({
      tenantId,
      actorId: userId,
      action: 'project.create',
      targetType: 'Project',
      targetId: project.id,
      meta: { name: project.name, subdomain },
    });

    return this.get(project.id);
  }

  async update(tenantId: string, userId: string, projectId: string, input: UpdateProjectInput): Promise<ProjectSummary> {
    const project = await this.prisma.db.project.findFirst({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    if (input.customCode && input.customCode.trim().length > 0) {
      await this.entitlements.assert(tenantId, 'customCode', 1);
    }

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.seo !== undefined) data.seo = { ...((project.seo as Seo) ?? {}), ...input.seo };
    if (input.faviconUrl !== undefined) data.faviconUrl = input.faviconUrl;
    if (input.customCode !== undefined) data.customCode = input.customCode;

    if (input.subdomain && input.subdomain !== project.subdomain) {
      data.subdomain = await this.uniqueSubdomain(input.subdomain, project.id);
    }

    await this.prisma.db.project.update({ where: { id: project.id }, data });
    if (input.subdomain) await this.siteCache.invalidate(project.id);
    await this.audit.record({ tenantId, actorId: userId, action: 'project.update', targetType: 'Project', targetId: project.id });
    return this.get(project.id);
  }

  async remove(tenantId: string, userId: string, projectId: string) {
    const project = await this.prisma.db.project.findFirst({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    await this.prisma.db.project.delete({ where: { id: project.id } });
    await this.audit.record({ tenantId, actorId: userId, action: 'project.delete', targetType: 'Project', targetId: project.id });
    return { ok: true };
  }

  async publishAll(projectId: string, userId: string) {
    const project = await this.prisma.db.project.findFirst({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new NotFoundException('Project not found');
    const pages = await this.prisma.db.page.findMany({
      where: { projectId },
      orderBy: { sortIndex: 'asc' },
      select: { id: true, title: true },
    });
    const published: { id: string; title: string; version: number }[] = [];
    for (const page of pages) {
      const result = await this.pages.publish(page.id, userId, 'Publish all');
      published.push({ id: page.id, title: page.title, version: result.version });
    }
    return { published };
  }

  async projectUrl(projectId: string): Promise<string> {
    const project = await this.get(projectId);
    return project.siteUrl;
  }

  async stats(projectId: string) {
    const project = await this.prisma.db.project.findFirst({ where: { id: projectId }, select: { id: true, name: true } });
    if (!project) throw new NotFoundException('Project not found');

    const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    since.setHours(0, 0, 0, 0);

    const [pages, views, publishEvents, totalPublishes] = await Promise.all([
      this.prisma.db.page.findMany({
        where: { projectId },
        select: { id: true, title: true, path: true, status: true, updatedAt: true },
        orderBy: { sortIndex: 'asc' },
      }),
      this.prisma.db.pageViewDaily.groupBy({
        by: ['pageId'],
        where: { projectId, date: { gte: since } },
        _sum: { count: true },
      }),
      this.prisma.db.publishEvent.findMany({
        where: { projectId, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.db.publishEvent.count({ where: { projectId } }),
    ]);

    const viewsByPage = new Map(views.map((row) => [row.pageId, row._sum.count ?? 0]));
    const series = new Map<string, number>();
    for (let day = 0; day < 30; day += 1) {
      const date = new Date(since.getTime() + day * 24 * 60 * 60 * 1000);
      series.set(date.toISOString().slice(0, 10), 0);
    }
    for (const event of publishEvents) {
      const key = event.createdAt.toISOString().slice(0, 10);
      if (series.has(key)) series.set(key, (series.get(key) ?? 0) + 1);
    }

    return {
      projectId: project.id,
      name: project.name,
      totalPublishes,
      totalViews: [...viewsByPage.values()].reduce((sum, value) => sum + value, 0),
      publishesByDay: [...series.entries()].map(([date, count]) => ({ date, count })),
      pages: pages.map((page) => ({
        id: page.id,
        title: page.title,
        path: page.path,
        status: page.status,
        views: viewsByPage.get(page.id) ?? 0,
        updatedAt: page.updatedAt.toISOString(),
      })),
    };
  }

  private async resolveDocument(tenantId: string, templateId?: string): Promise<PageDocument> {
    if (templateId) {
      const document = await this.templates.documentFor(templateId, tenantId);
      if (document) return migrateDocument(document);
    }
    return blankDocument();
  }

  private async uniqueSubdomain(base: string, excludeProjectId?: string): Promise<string> {
    let candidate = slugify(base, 'site').slice(0, 48) || 'site';
    if (RESERVED_SUBDOMAINS.has(candidate)) candidate = `${candidate}-${randomSuffix(3)}`;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const existing = await this.prisma.raw.project.findUnique({
        where: { subdomain: candidate },
        select: { id: true },
      });
      if (!existing || existing.id === excludeProjectId) return candidate;
      candidate = `${slugify(base, 'site').slice(0, 40)}-${randomSuffix(4)}`;
    }
    return `${slugify(base, 'site').slice(0, 32)}-${Date.now().toString(36)}`;
  }

  private toSummary(project: {
    id: string;
    name: string;
    subdomain: string;
    status: string;
    theme: unknown;
    seo: unknown;
    faviconUrl: string | null;
    customCode?: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    domains: { host: string; kind: string; status: string; isPrimary: boolean }[];
    pages: { status: string; draftRevision: number; publishedRevision: number | null; updatedAt: Date; publishedAt: Date | null }[];
  }): ProjectSummary {
    const customDomains = project.domains
      .filter((domain) => domain.kind === 'CUSTOM')
      .map((domain) => ({
        host: domain.host,
        kind: 'CUSTOM' as const,
        verified: domain.status === 'VERIFIED',
        primary: domain.isPrimary,
      }));
    const primaryCustom = customDomains.find((domain) => domain.primary && domain.verified);

    return {
      id: project.id,
      name: project.name,
      subdomain: project.subdomain,
      status: project.status as ProjectSummary['status'],
      theme: project.theme,
      seo: (project.seo as Seo) ?? {},
      faviconUrl: project.faviconUrl,
      customCode: project.customCode ?? null,
      publishedAt: project.publishedAt?.toISOString() ?? null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      pageCount: project.pages.length,
      publishedPageCount: project.pages.filter((page) => page.status === 'PUBLISHED').length,
      domains: [
        { host: `${project.subdomain}.${env.siteDomain}`, kind: 'SUBDOMAIN' as const, verified: true, primary: !primaryCustom },
        ...customDomains,
      ],
      siteUrl: primaryCustom ? `https://${primaryCustom.host}` : `http://${project.subdomain}.${env.siteDomain}`,
      hasUnpublishedChanges: project.pages.some(
        (page) => page.status !== 'PUBLISHED' || page.publishedRevision !== page.draftRevision,
      ),
    };
  }
}
