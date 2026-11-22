import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { planLimitsSchema, upsertTemplateSchema } from '@yazi/contracts';
import { z } from 'zod';
import { AuthGuard, CurrentUser, SuperAdminGuard, ZodValidationPipe, type AuthUserContext } from '../../common/guards';
import { AdminService } from './admin.service';

const updateUserSchema = z.object({
  status: z.enum(['active', 'suspended']).optional(),
  role: z.enum(['USER', 'SUPER_ADMIN']).optional(),
});

const upsertPlanSchema = z.object({
  code: z.string().regex(/^[a-z0-9-]{2,32}$/),
  name: z.string().min(1).max(60),
  description: z.string().max(300).nullable().optional(),
  priceCents: z.number().int().min(0),
  currency: z.string().length(3).optional(),
  interval: z.enum(['MONTH', 'YEAR']).optional(),
  stripePriceId: z.string().max(200).nullable().optional(),
  limits: planLimitsSchema,
  isActive: z.boolean().optional(),
  sortIndex: z.number().int().optional(),
});

@Controller('admin')
@UseGuards(AuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  users(@Query('q') q?: string, @Query('page') page?: string) {
    return this.admin.users(q?.trim() || undefined, Math.max(1, Number(page ?? 1) || 1));
  }

  @Patch('users/:id')
  updateUser(
    @CurrentUser() user: AuthUserContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: z.infer<typeof updateUserSchema>,
  ) {
    return this.admin.updateUser(user.id, id, body);
  }

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('plans')
  plans() {
    return this.admin.plans();
  }

  @Post('plans')
  upsertPlan(
    @CurrentUser() user: AuthUserContext,
    @Body(new ZodValidationPipe(upsertPlanSchema)) body: z.infer<typeof upsertPlanSchema>,
  ) {
    return this.admin.upsertPlan(user.id, body);
  }

  @Delete('plans/:code')
  deletePlan(@CurrentUser() user: AuthUserContext, @Param('code') code: string) {
    return this.admin.deletePlan(user.id, code);
  }

  @Get('templates')
  templates() {
    return this.admin.templatesList();
  }

  @Post('templates')
  upsertTemplate(
    @CurrentUser() user: AuthUserContext,
    @Body(new ZodValidationPipe(upsertTemplateSchema)) body: z.infer<typeof upsertTemplateSchema>,
  ) {
    return this.admin.upsertTemplate(user.id, body);
  }

  @Delete('templates/:id')
  deleteTemplate(@CurrentUser() user: AuthUserContext, @Param('id') id: string) {
    return this.admin.deleteTemplate(user.id, id);
  }

  @Get('audit')
  audit(@Query('tenantId') tenantId?: string) {
    return this.admin.auditLog(tenantId);
  }
}
