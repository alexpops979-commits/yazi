import { Injectable } from '@nestjs/common';
import { hashPassword, randomToken, runWithTenant } from '@dalmg/db';
import { PrismaService } from '../../common/prisma.service';
import { AuthService } from './auth.service';
import { ProjectsService } from '../projects/projects.service';
import { randomSuffix } from '../../common/crypto';
import { AuditService } from '../../common/audit.service';

/**
 * One-click demo access for GitHub/portfolio visitors: no form, no email.
 * Each guest gets an isolated workspace with a published sample site, so
 * visitors never touch each other's data (tenant isolation applies as usual).
 */
@Injectable()
export class GuestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly projects: ProjectsService,
    private readonly audit: AuditService,
  ) {}

  async createGuest() {
    const suffix = randomSuffix(8);
    const email = `guest-${suffix}@demo.dalmg.dev`;

    const user = await this.prisma.raw.user.create({
      data: {
        email,
        name: 'Гость',
        passwordHash: await hashPassword(randomToken(24)),
        emailVerifiedAt: new Date(),
      },
    });

    const tenant = await this.prisma.raw.tenant.create({
      data: {
        name: `Демо ${suffix.slice(0, 4).toUpperCase()}`,
        slug: `demo-${suffix}`,
        planCode: 'business',
      },
    });

    await this.prisma.raw.membership.create({
      data: { tenantId: tenant.id, userId: user.id, role: 'OWNER' },
    });
    await this.prisma.raw.subscription.create({
      data: {
        tenantId: tenant.id,
        planCode: 'business',
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    const template = await this.prisma.raw.template.findFirst({
      where: { isSystem: true, isPublished: true },
      orderBy: { sortIndex: 'asc' },
    });

    await runWithTenant(tenant.id, async () => {
      const project = await this.projects.create(tenant.id, user.id, {
        name: template?.name ?? 'Демо-сайт',
        templateId: template?.id,
      });
      await this.projects.publishAll(project.id, user.id);
    });

    await this.audit.record({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'auth.guest',
      targetType: 'User',
      targetId: user.id,
    });

    const tokens = await this.auth.issue(user.id);
    return { tokens, me: await this.auth.me(user.id) };
  }
}
