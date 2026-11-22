import { BadRequestException, Injectable } from '@nestjs/common';
import { promises as dns } from 'node:dns';
import { randomToken } from '@yazi/db';
import type { DomainSummary } from '@yazi/contracts';
import { PrismaService } from '../../common/prisma.service';
import { EntitlementsService } from '../../common/entitlements.service';
import { SiteCacheService } from '../../common/site-cache.service';
import { AuditService } from '../../common/audit.service';
import { ConflictException, NotFoundException } from '../../common/errors';
import { env } from '../../env';

const VERIFY_PREFIX = '_yazi-verify';

@Injectable()
export class DomainsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly siteCache: SiteCacheService,
    private readonly audit: AuditService,
  ) {}

  async list(projectId: string): Promise<DomainSummary[]> {
    const project = await this.prisma.db.project.findFirst({ where: { id: projectId }, select: { id: true, subdomain: true } });
    if (!project) throw new NotFoundException('Project not found');
    const rows = await this.prisma.db.projectDomain.findMany({
      where: { projectId, kind: 'CUSTOM' },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toSummary(row));
  }

  async add(tenantId: string, projectId: string, host: string): Promise<DomainSummary> {
    const project = await this.prisma.db.project.findFirst({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const normalized = host.replace(/^www\./, '').toLowerCase();
    if (normalized === env.siteDomainHost || normalized.endsWith(`.${env.siteDomainHost}`)) {
      throw new BadRequestException(`Use the built-in subdomain instead of ${env.siteDomainHost}`);
    }
    await this.entitlements.assert(tenantId, 'customDomains', 1);

    const taken = await this.prisma.raw.projectDomain.findUnique({ where: { host: normalized } });
    if (taken) throw new ConflictException('This domain is already connected to a site', 'DOMAIN_TAKEN');

    const row = await this.prisma.db.projectDomain.create({
      data: {
        tenantId,
        projectId,
        host: normalized,
        kind: 'CUSTOM',
        status: 'PENDING',
        verificationToken: randomToken(16),
      },
    });
    await this.audit.record({ tenantId, action: 'domain.add', targetType: 'ProjectDomain', targetId: row.id, meta: { host: normalized } });
    return this.toSummary(row);
  }

  async verify(tenantId: string, domainId: string): Promise<DomainSummary> {
    const row = await this.prisma.db.projectDomain.findFirst({ where: { id: domainId, tenantId } });
    if (!row) throw new NotFoundException('Domain not found');

    let verified = false;
    try {
      const records = await dns.resolveTxt(`${VERIFY_PREFIX}.${row.host}`);
      verified = records.some((chunks) => chunks.join('').trim() === row.verificationToken);
    } catch {
      verified = false;
    }

    // A CNAME pointing to the platform is also accepted (common at registrars without TXT support).
    if (!verified) {
      try {
        const cnames = await dns.resolveCname(row.host);
        verified = cnames.some((value) => value.toLowerCase().endsWith(env.siteDomainHost));
      } catch {
        verified = false;
      }
    }

    const existingPrimary = await this.prisma.db.projectDomain.count({
      where: { projectId: row.projectId, isPrimary: true, kind: 'CUSTOM' },
    });

    const updated = await this.prisma.db.projectDomain.update({
      where: { id: row.id },
      data: {
        status: verified ? 'VERIFIED' : 'FAILED',
        verifiedAt: verified ? new Date() : null,
        isPrimary: verified && existingPrimary === 0 ? true : row.isPrimary,
      },
    });
    if (verified) await this.siteCache.invalidate(row.projectId);
    await this.audit.record({
      tenantId,
      action: 'domain.verify',
      targetType: 'ProjectDomain',
      targetId: row.id,
      meta: { host: row.host, verified },
    });
    return this.toSummary(updated);
  }

  async setPrimary(tenantId: string, domainId: string): Promise<DomainSummary> {
    const row = await this.prisma.db.projectDomain.findFirst({ where: { id: domainId, tenantId } });
    if (!row) throw new NotFoundException('Domain not found');
    if (row.status !== 'VERIFIED') throw new ConflictException('Verify the domain first');
    await this.prisma.db.projectDomain.updateMany({ where: { projectId: row.projectId }, data: { isPrimary: false } });
    const updated = await this.prisma.db.projectDomain.update({ where: { id: row.id }, data: { isPrimary: true } });
    return this.toSummary(updated);
  }

  async remove(tenantId: string, domainId: string) {
    const row = await this.prisma.db.projectDomain.findFirst({ where: { id: domainId, tenantId } });
    if (!row) throw new NotFoundException('Domain not found');
    await this.prisma.db.projectDomain.delete({ where: { id: row.id } });
    await this.siteCache.invalidate(row.projectId);
    await this.audit.record({ tenantId, action: 'domain.remove', targetType: 'ProjectDomain', targetId: row.id });
    return { ok: true };
  }

  private toSummary(row: {
    id: string;
    host: string;
    kind: string;
    status: string;
    verifiedAt: Date | null;
    verificationToken: string;
    isPrimary: boolean;
  }): DomainSummary {
    return {
      id: row.id,
      host: row.host,
      kind: row.kind as DomainSummary['kind'],
      status: row.status as DomainSummary['status'],
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
      verificationToken: row.verificationToken,
      isPrimary: row.isPrimary,
      instructions: [
        { type: 'TXT', name: `${VERIFY_PREFIX}.${row.host}`, value: row.verificationToken },
        { type: 'A', name: '@', value: env.serverIp },
        { type: 'CNAME', name: 'www', value: `${env.siteDomainHost}` },
      ],
    };
  }
}
