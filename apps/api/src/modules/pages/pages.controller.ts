import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { createPageSchema, saveDraftSchema, updatePageSchema } from '@yazi/contracts';
import type { z } from 'zod';
import {
  AuthGuard,
  CurrentUser,
  MinRole,
  TenantGuard,
  TenantId,
  ZodValidationPipe,
  type AuthUserContext,
} from '../../common/guards';
import { PagesService } from './pages.service';

type CreatePageBody = z.infer<typeof createPageSchema>;
type UpdatePageBody = z.infer<typeof updatePageSchema>;
type SaveDraftBody = z.infer<typeof saveDraftSchema>;

@Controller()
@UseGuards(AuthGuard, TenantGuard)
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Get('projects/:projectId/pages')
  list(@Param('projectId') projectId: string) {
    return this.pages.list(projectId);
  }

  @Post('projects/:projectId/pages')
  @MinRole('EDITOR')
  create(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(createPageSchema)) body: CreatePageBody,
  ) {
    return this.pages.create(tenantId, projectId, body);
  }

  @Get('pages/:id')
  get(@Param('id') id: string) {
    return this.pages.get(id);
  }

  @Patch('pages/:id')
  @MinRole('EDITOR')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updatePageSchema)) body: UpdatePageBody) {
    return this.pages.update(id, body);
  }

  @Delete('pages/:id')
  @MinRole('EDITOR')
  remove(@Param('id') id: string) {
    return this.pages.remove(id);
  }

  @Post('pages/:id/draft')
  @MinRole('EDITOR')
  saveDraft(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveDraftSchema)) body: SaveDraftBody,
  ) {
    return this.pages.saveDraft(tenantId, id, body);
  }

  @Post('pages/:id/publish')
  @MinRole('EDITOR')
  publish(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
    @Body() body: { note?: string },
  ) {
    return this.pages.publish(id, user.id, body?.note);
  }

  @Get('pages/:id/versions')
  versions(@Param('id') id: string) {
    return this.pages.versions(id);
  }

  @Get('pages/:id/versions/:versionId')
  versionDocument(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.pages.versionDocument(id, versionId);
  }

  @Post('pages/:id/versions/:versionId/restore')
  @MinRole('EDITOR')
  restore(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.pages.restore(id, versionId, user.id);
  }

  @Post('pages/:id/duplicate')
  @MinRole('EDITOR')
  duplicate(@Param('id') id: string) {
    return this.pages.duplicate(id);
  }

  @Post('pages/:id/preview-token')
  previewToken(@Param('id') id: string, @CurrentUser() user: AuthUserContext) {
    return this.pages.previewToken(id, user.id);
  }
}
