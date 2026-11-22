import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { setDefaultWorkspace, type DefaultWorkspace } from './workspace';

/**
 * Accounts are disabled in this build: one workspace and one internal "system"
 * user are ensured at boot. The system user only exists for audit/createdById
 * foreign keys — there is no way to log in as it.
 */
@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ensure(): Promise<DefaultWorkspace> {
    let tenant = await this.prisma.raw.tenant.findUnique({ where: { slug: 'demo-studio' } });
    if (!tenant) tenant = await this.prisma.raw.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!tenant) {
      tenant = await this.prisma.raw.tenant.create({ data: { name: 'Dalmg', slug: 'main', planCode: 'business' } });
    }

    let user = await this.prisma.raw.user.findUnique({ where: { email: 'system@dalmg.local' } });
    if (!user) {
      user = await this.prisma.raw.user.create({
        data: {
          email: 'system@dalmg.local',
          name: 'Dalmg',
          passwordHash: 'disabled',
          role: 'SUPER_ADMIN',
          emailVerifiedAt: new Date(),
        },
      });
    }

    const workspace: DefaultWorkspace = { tenantId: tenant.id, userId: user.id, name: tenant.name };
    setDefaultWorkspace(workspace);
    this.logger.log(`Single workspace ready: ${tenant.name} (${tenant.id})`);
    return workspace;
  }
}
