import { Controller, Get } from '@nestjs/common';
import { Public } from './common/guards';
import { PrismaService } from './common/prisma.service';
import { getDefaultWorkspace } from './common/workspace';
import { env } from './env';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  async health() {
    let database = 'ok';
    try {
      await this.prisma.raw.$queryRaw`SELECT 1`;
    } catch {
      database = 'unreachable';
    }
    return {
      ok: database === 'ok',
      service: 'yazi-api',
      database,
      mode: env.singleWorkspace ? 'single-workspace' : 'multi-tenant',
      siteDomain: env.siteDomain,
      stripe: env.stripe.secretKey ? 'configured' : 'mock',
      timestamp: new Date().toISOString(),
    };
  }

  /** Accounts are disabled: the UI learns which workspace to open from here. */
  @Public()
  @Get('workspace/bootstrap')
  bootstrap() {
    const workspace = getDefaultWorkspace();
    return {
      mode: env.singleWorkspace ? 'single' : 'multi',
      plansEnforced: env.plansEnforced,
      tenant: workspace
        ? { id: workspace.tenantId, name: workspace.name, slug: 'main', planCode: 'business', role: 'OWNER' }
        : null,
    };
  }
}
