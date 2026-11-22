import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { addDomainSchema } from '@yazi/contracts';
import { AuthGuard, MinRole, TenantGuard, TenantId, ZodValidationPipe } from '../../common/guards';
import { DomainsService } from './domains.service';

@Controller()
@UseGuards(AuthGuard, TenantGuard)
export class DomainsController {
  constructor(private readonly domains: DomainsService) {}

  @Get('projects/:projectId/domains')
  list(@Param('projectId') projectId: string) {
    return this.domains.list(projectId);
  }

  @Post('projects/:projectId/domains')
  @MinRole('ADMIN')
  add(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(addDomainSchema)) body: { host: string },
  ) {
    return this.domains.add(tenantId, projectId, body.host);
  }

  @Post('domains/:id/verify')
  @MinRole('ADMIN')
  verify(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.domains.verify(tenantId, id);
  }

  @Post('domains/:id/primary')
  @MinRole('ADMIN')
  primary(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.domains.setPrimary(tenantId, id);
  }

  @Delete('domains/:id')
  @MinRole('ADMIN')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.domains.remove(tenantId, id);
  }
}
