import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { createTenantSchema, inviteMemberSchema, MEMBERSHIP_ROLES, updateTenantSchema } from '@yazi/contracts';
import { AuthGuard, CurrentUser, MinRole, TenantGuard, TenantId, ZodValidationPipe, type AuthUserContext } from '../../common/guards';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@UseGuards(AuthGuard)
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list(@CurrentUser() user: AuthUserContext) {
    return this.tenants.listForUser(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUserContext,
    @Body(new ZodValidationPipe(createTenantSchema)) body: { name: string },
  ) {
    return this.tenants.create(user.id, body.name);
  }

  @Post('invitations/:token/accept')
  accept(@CurrentUser() user: AuthUserContext, @Param('token') token: string) {
    return this.tenants.acceptInvitation(user.id, token);
  }
}

@Controller('workspace')
@UseGuards(AuthGuard, TenantGuard)
export class WorkspaceController {
  constructor(private readonly tenants: TenantsService) {}

  @Get('members')
  members(@TenantId() tenantId: string) {
    return this.tenants.members(tenantId);
  }

  @Patch()
  @MinRole('ADMIN')
  rename(@TenantId() tenantId: string, @Body(new ZodValidationPipe(updateTenantSchema)) body: { name?: string }) {
    return this.tenants.rename(tenantId, body.name ?? '');
  }

  @Post('invitations')
  @MinRole('ADMIN')
  invite(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthUserContext,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: { email: string; role: (typeof MEMBERSHIP_ROLES)[number] },
  ) {
    return this.tenants.invite(tenantId, user.id, body.email, body.role);
  }

  @Get('invitations')
  @MinRole('ADMIN')
  invitations(@TenantId() tenantId: string) {
    return this.tenants.invitations(tenantId);
  }

  @Delete('invitations/:id')
  @MinRole('ADMIN')
  revoke(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.tenants.revokeInvitation(tenantId, id);
  }

  @Delete('members/:id')
  @MinRole('ADMIN')
  removeMember(@TenantId() tenantId: string, @CurrentUser() user: AuthUserContext, @Param('id') id: string) {
    return this.tenants.removeMember(tenantId, user.id, id);
  }
}
