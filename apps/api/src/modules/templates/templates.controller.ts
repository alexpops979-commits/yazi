import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard, TenantGuard, TenantId } from '../../common/guards';
import { TemplatesService } from './templates.service';

@Controller('templates')
@UseGuards(AuthGuard, TenantGuard)
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.templates.list(tenantId);
  }

  @Get(':id')
  get(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.templates.get(id, tenantId);
  }
}
