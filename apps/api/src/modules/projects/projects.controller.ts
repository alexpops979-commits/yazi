import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { createProjectSchema, updateProjectSchema } from '@yazi/contracts';
import {
  AuthGuard,
  CurrentUser,
  MinRole,
  TenantGuard,
  TenantId,
  ZodValidationPipe,
  type AuthUserContext,
} from '../../common/guards';
import { ProjectsService } from './projects.service';
import type { z } from 'zod';

type CreateProjectBody = z.infer<typeof createProjectSchema>;
type UpdateProjectBody = z.infer<typeof updateProjectSchema>;

@Controller('projects')
@UseGuards(AuthGuard, TenantGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.projects.list(tenantId);
  }

  @Post()
  @MinRole('EDITOR')
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUserContext,
    @Body(new ZodValidationPipe(createProjectSchema)) body: CreateProjectBody,
  ) {
    return this.projects.create(tenantId, user.id, body);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.projects.get(id);
  }

  @Patch(':id')
  @MinRole('EDITOR')
  update(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) body: UpdateProjectBody,
  ) {
    return this.projects.update(tenantId, user.id, id, body);
  }

  @Delete(':id')
  @MinRole('ADMIN')
  remove(@TenantId() tenantId: string, @CurrentUser() user: AuthUserContext, @Param('id') id: string) {
    return this.projects.remove(tenantId, user.id, id);
  }

  @Post(':id/publish')
  @MinRole('EDITOR')
  publish(@CurrentUser() user: AuthUserContext, @Param('id') id: string) {
    return this.projects.publishAll(id, user.id);
  }

  @Get(':id/stats')
  stats(@Param('id') id: string) {
    return this.projects.stats(id);
  }
}
