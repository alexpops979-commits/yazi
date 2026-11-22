import { Injectable } from '@nestjs/common';
import { migrateDocument, parseDocument, type PageDocument } from '@dalmg/page-schema';
import { PrismaService } from '../../common/prisma.service';
import { NotFoundException } from '../../common/errors';
import type { TemplateSummary } from '@dalmg/contracts';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string): Promise<TemplateSummary[]> {
    const rows = await this.prisma.raw.template.findMany({
      where: {
        isPublished: true,
        OR: [{ isSystem: true }, { tenantId }],
      },
      orderBy: [{ isSystem: 'desc' }, { sortIndex: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((row) => this.toSummary(row));
  }

  async listAll(): Promise<TemplateSummary[]> {
    const rows = await this.prisma.raw.template.findMany({ orderBy: [{ sortIndex: 'asc' }, { createdAt: 'asc' }] });
    return rows.map((row) => this.toSummary(row));
  }

  async get(id: string, tenantId: string): Promise<{ summary: TemplateSummary; document: PageDocument }> {
    const row = await this.prisma.raw.template.findFirst({
      where: { id, OR: [{ isSystem: true }, { tenantId }] },
    });
    if (!row) throw new NotFoundException('Template not found');
    return { summary: this.toSummary(row), document: migrateDocument(row.document) };
  }

  async documentFor(id: string | undefined, tenantId: string): Promise<PageDocument | null> {
    if (!id) return null;
    const row = await this.prisma.raw.template.findFirst({ where: { id, OR: [{ isSystem: true }, { tenantId }] } });
    if (!row) return null;
    return migrateDocument(row.document);
  }

  /** Admin CRUD — validates the document so a broken template can never be saved. */
  async upsert(input: {
    id?: string;
    name: string;
    slug: string;
    category: string;
    description?: string;
    thumbnailUrl?: string | null;
    document: unknown;
    isPublished?: boolean;
    sortIndex?: number;
  }) {
    const document = parseDocument(input.document);
    const data = {
      name: input.name,
      slug: input.slug,
      category: input.category,
      description: input.description ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      document: document as never,
      isPublished: input.isPublished ?? true,
      sortIndex: input.sortIndex ?? 0,
      isSystem: true,
    };
    if (input.id) {
      return this.prisma.raw.template.update({ where: { id: input.id }, data });
    }
    return this.prisma.raw.template.create({ data });
  }

  async remove(id: string) {
    const template = await this.prisma.raw.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    await this.prisma.raw.template.delete({ where: { id } });
    return { ok: true };
  }

  private toSummary(row: {
    id: string;
    name: string;
    slug: string;
    category: string;
    description: string | null;
    thumbnailUrl: string | null;
    isSystem: boolean;
    isPublished: boolean;
    createdAt: Date;
  }): TemplateSummary {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: row.category as TemplateSummary['category'],
      description: row.description,
      thumbnailUrl: row.thumbnailUrl,
      isSystem: row.isSystem,
      isPublished: row.isPublished,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
