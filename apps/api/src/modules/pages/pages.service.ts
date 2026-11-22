import { HttpException, Injectable } from '@nestjs/common';
import {
  cloneNodeWithNewIds,
  migrateDocument,
  parseDocument,
  pruneUnknownBlocks,
  type PageDocument,
  type PageNode,
} from '@yazi/page-schema';
import { BLOCK_TYPES, type CreatePageInput, type PageDetail, type PageSummary, type PageVersionSummary, type Seo, type UpdatePageInput } from '@yazi/contracts';
import { PrismaService } from '../../common/prisma.service';
import { EntitlementsService } from '../../common/entitlements.service';
import { SiteCacheService } from '../../common/site-cache.service';
import { AuditService } from '../../common/audit.service';
import { TemplatesService } from '../templates/templates.service';
import { ConflictException, NotFoundException } from '../../common/errors';
import { signPreviewToken } from '../../common/crypto';

const MAX_DOCUMENT_BYTES = 2_000_000;

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly templates: TemplatesService,
    private readonly siteCache: SiteCacheService,
    private readonly audit: AuditService,
  ) {}

  async list(projectId: string): Promise<PageSummary[]> {
    const pages = await this.prisma.db.page.findMany({
      where: { projectId },
      include: { publishedVersion: { select: { version: true } } },
      orderBy: [{ sortIndex: 'asc' }, { createdAt: 'asc' }],
    });
    return pages.map((page) => this.toSummary(page));
  }

  async get(pageId: string): Promise<PageDetail> {
    const page = await this.prisma.db.page.findFirst({
      where: { id: pageId },
      include: { publishedVersion: { select: { version: true } } },
    });
    if (!page) throw new NotFoundException('Page not found');

    const document = migrateDocument(page.draftDocument);
    return {
      ...this.toSummary(page),
      document,
      publishedVersion: page.publishedVersion?.version ?? null,
      isDirty:
        page.status !== 'PUBLISHED' ||
        page.publishedRevision === null ||
        page.publishedRevision !== page.draftRevision,
    };
  }

  async create(tenantId: string, projectId: string, input: CreatePageInput): Promise<PageDetail> {
    const project = await this.prisma.db.project.findFirst({ where: { id: projectId }, select: { id: true, tenantId: true } });
    if (!project) throw new NotFoundException('Project not found');

    await this.entitlements.assertWithin(tenantId, 'pagesPerProject', await this.prisma.db.page.count({ where: { projectId } }));

    const path = normalizePath(input.path);
    const existing = await this.prisma.db.page.findFirst({ where: { projectId, path } });
    if (existing) throw new ConflictException(`Path ${path} is already used by "${existing.title}"`, 'PATH_TAKEN');

    let document: PageDocument | null = null;
    if (input.fromPageId) {
      const source = await this.prisma.db.page.findFirst({ where: { id: input.fromPageId, projectId } });
      if (!source) throw new NotFoundException('Source page not found');
      const sourceDoc = migrateDocument(source.draftDocument);
      document = { ...sourceDoc, sections: sourceDoc.sections.map(cloneNodeWithNewIds) };
    } else if (input.templateId) {
      document = await this.templates.documentFor(input.templateId, tenantId);
    }
    if (!document) document = migrateDocument({});

    const maxSort = await this.prisma.db.page.aggregate({ where: { projectId }, _max: { sortIndex: true } });
    const page = await this.prisma.db.page.create({
      data: {
        tenantId,
        projectId,
        title: input.title,
        path,
        seo: {} as never,
        sortIndex: (maxSort._max.sortIndex ?? 0) + 1,
        draftDocument: document as never,
        draftRevision: 1,
      },
    });
    return this.get(page.id);
  }

  async update(pageId: string, input: UpdatePageInput): Promise<PageSummary> {
    const page = await this.prisma.db.page.findFirst({ where: { id: pageId } });
    if (!page) throw new NotFoundException('Page not found');

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.sortIndex !== undefined) data.sortIndex = input.sortIndex;
    if (input.seo !== undefined) data.seo = { ...((page.seo as Seo) ?? {}), ...input.seo };

    if (input.path !== undefined) {
      const path = normalizePath(input.path);
      if (path !== page.path) {
        const clash = await this.prisma.db.page.findFirst({ where: { projectId: page.projectId, path } });
        if (clash) throw new ConflictException(`Path ${path} is already used by "${clash.title}"`, 'PATH_TAKEN');
        data.path = path;
        await this.siteCache.invalidate(page.projectId);
      }
    }

    const updated = await this.prisma.db.page.update({
      where: { id: page.id },
      data,
      include: { publishedVersion: { select: { version: true } } },
    });
    return this.toSummary(updated);
  }

  /** Autosave. `revision` is an optimistic lock: a stale client gets 409 with the server document. */
  async saveDraft(tenantId: string, pageId: string, input: { document: unknown; revision: number }) {
    const page = await this.prisma.db.page.findFirst({ where: { id: pageId } });
    if (!page) throw new NotFoundException('Page not found');

    const serialized = JSON.stringify(input.document ?? {});
    if (serialized.length > MAX_DOCUMENT_BYTES) {
      throw new HttpException({ statusCode: 413, code: 'DOCUMENT_TOO_LARGE', message: 'Page is too large to save' }, 413);
    }

    const document = parseDocument(input.document);
    const result = await this.prisma.db.page.updateMany({
      where: { id: page.id, tenantId, draftRevision: input.revision },
      data: { draftDocument: document as never, draftRevision: input.revision + 1 },
    });

    if (result.count === 0) {
      const current = await this.prisma.db.page.findFirst({ where: { id: page.id } });
      throw new HttpException(
        {
          statusCode: 409,
          code: 'REVISION_CONFLICT',
          message: 'This page was changed in another tab',
          details: { revision: current?.draftRevision ?? 0, document: current?.draftDocument ?? null },
        },
        409,
      );
    }

    return { revision: input.revision + 1, savedAt: new Date().toISOString() };
  }

  async publish(pageId: string, userId: string, note?: string) {
    const page = await this.prisma.db.page.findFirst({
      where: { id: pageId },
      include: { project: { select: { id: true, tenantId: true } } },
    });
    if (!page) throw new NotFoundException('Page not found');

    const entitlements = await this.entitlements.resolve(page.tenantId);
    let document = pruneUnknownBlocks(parseDocument(page.draftDocument), new Set(BLOCK_TYPES));
    if (!entitlements.limits.customCode) {
      document = stripCustomBlocks(document);
    }

    const last = await this.prisma.db.pageVersion.findFirst({
      where: { pageId: page.id },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = await this.prisma.db.pageVersion.create({
      data: {
        tenantId: page.tenantId,
        pageId: page.id,
        version: (last?.version ?? 0) + 1,
        document: document as never,
        note: note ?? null,
        createdById: userId,
      },
    });

    const publishedAt = new Date();
    await this.prisma.db.page.update({
      where: { id: page.id },
      data: {
        status: 'PUBLISHED',
        publishedVersionId: version.id,
        publishedAt,
        publishedRevision: page.draftRevision,
        draftDocument: document as never,
      },
    });
    await this.prisma.db.project.update({
      where: { id: page.projectId },
      data: { status: 'PUBLISHED', publishedAt },
    });
    await this.prisma.db.publishEvent.create({
      data: { tenantId: page.tenantId, projectId: page.projectId, pageId: page.id, versionId: version.id, actorId: userId },
    });

    await this.pruneVersions(page.tenantId, page.id, entitlements.limits.versionHistoryDays);
    await this.siteCache.invalidate(page.projectId);
    await this.audit.record({
      tenantId: page.tenantId,
      actorId: userId,
      action: 'page.publish',
      targetType: 'Page',
      targetId: page.id,
      meta: { version: version.version },
    });

    return { version: version.version, publishedAt: publishedAt.toISOString(), strippedCustomCode: !entitlements.limits.customCode };
  }

  async versions(pageId: string): Promise<PageVersionSummary[]> {
    const page = await this.prisma.db.page.findFirst({ where: { id: pageId }, select: { publishedVersionId: true } });
    if (!page) throw new NotFoundException('Page not found');

    const rows = await this.prisma.db.pageVersion.findMany({
      where: { pageId },
      orderBy: { version: 'desc' },
      take: 50,
      include: { createdBy: { select: { name: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      version: row.version,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy?.name ?? null,
      isCurrentDraftSource: row.id === page.publishedVersionId,
    }));
  }

  async versionDocument(pageId: string, versionId: string): Promise<PageDocument> {
    const version = await this.prisma.db.pageVersion.findFirst({ where: { id: versionId, pageId } });
    if (!version) throw new NotFoundException('Version not found');
    return migrateDocument(version.document);
  }

  async restore(pageId: string, versionId: string, userId: string) {
    const page = await this.prisma.db.page.findFirst({ where: { id: pageId } });
    if (!page) throw new NotFoundException('Page not found');
    const document = await this.versionDocument(pageId, versionId);

    await this.prisma.db.page.update({
      where: { id: page.id },
      data: { draftDocument: document as never, draftRevision: page.draftRevision + 1 },
    });
    await this.audit.record({
      tenantId: page.tenantId,
      actorId: userId,
      action: 'page.restore',
      targetType: 'Page',
      targetId: page.id,
      meta: { versionId },
    });
    return this.get(page.id);
  }

  async duplicate(pageId: string): Promise<PageDetail> {
    const page = await this.prisma.db.page.findFirst({ where: { id: pageId } });
    if (!page) throw new NotFoundException('Page not found');

    const basePath = page.path === '/' ? '/home' : page.path;
    let path = `${basePath}-copy`;
    for (let attempt = 2; attempt < 20; attempt += 1) {
      const clash = await this.prisma.db.page.findFirst({ where: { projectId: page.projectId, path } });
      if (!clash) break;
      path = `${basePath}-copy-${attempt}`;
    }

    const document = migrateDocument(page.draftDocument);
    const created = await this.prisma.db.page.create({
      data: {
        tenantId: page.tenantId,
        projectId: page.projectId,
        title: `${page.title} (copy)`,
        path,
        seo: page.seo as never,
        sortIndex: page.sortIndex + 1,
        draftDocument: { ...document, sections: document.sections.map(cloneNodeWithNewIds) } as never,
        draftRevision: 1,
      },
    });
    return this.get(created.id);
  }

  async remove(pageId: string) {
    const page = await this.prisma.db.page.findFirst({ where: { id: pageId } });
    if (!page) throw new NotFoundException('Page not found');
    const count = await this.prisma.db.page.count({ where: { projectId: page.projectId } });
    if (count <= 1) throw new ConflictException('A site needs at least one page');
    await this.prisma.db.page.delete({ where: { id: page.id } });
    await this.siteCache.invalidate(page.projectId);
    return { ok: true };
  }

  previewToken(pageId: string, userId: string) {
    return { token: signPreviewToken(pageId, userId), expiresIn: 3600 };
  }

  private async pruneVersions(tenantId: string, pageId: string, keepDays: number) {
    const cutoff = new Date(Date.now() - Math.max(keepDays, 1) * 24 * 60 * 60 * 1000);
    await this.prisma.db.pageVersion.deleteMany({
      where: { pageId, tenantId, createdAt: { lt: cutoff }, page: { publishedVersionId: { not: null } } },
    });
  }

  private toSummary(page: {
    id: string;
    projectId: string;
    title: string;
    path: string;
    status: string;
    seo: unknown;
    sortIndex: number;
    draftRevision: number;
    publishedRevision?: number | null;
    updatedAt: Date;
    publishedAt: Date | null;
    publishedVersion?: { version: number } | null;
  }): PageSummary & { publishedVersion?: number | null } {
    return {
      id: page.id,
      projectId: page.projectId,
      title: page.title,
      path: page.path,
      status: page.status as PageSummary['status'],
      seo: (page.seo as Seo) ?? {},
      sortIndex: page.sortIndex,
      revision: page.draftRevision,
      publishedRevision: page.publishedRevision ?? null,
      updatedAt: page.updatedAt.toISOString(),
      publishedAt: page.publishedAt?.toISOString() ?? null,
      publishedVersion: page.publishedVersion?.version ?? null,
    };
  }
}

function normalizePath(input: string): string {
  let path = input.trim().toLowerCase();
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path.replace(/\/{2,}/g, '/');
}

/** Plans without `customCode` cannot publish raw HTML/embeds. */
function stripCustomBlocks(document: PageDocument): PageDocument {
  const strip = (nodes: PageNode[]): PageNode[] =>
    nodes
      .filter((node) => node.type !== 'embed' && node.type !== 'html')
      .map((node) => (node.children ? { ...node, children: strip(node.children) } : node));
  return { ...document, sections: strip(document.sections) };
}
