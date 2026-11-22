import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { EntitlementsService } from './entitlements.service';
import { SiteCacheService } from './site-cache.service';
import { AuditService } from './audit.service';
import { WorkspaceService } from './workspace.service';
import { AuthRateLimitGuard } from './rate-limit.guard';
import { AuthGuard, SuperAdminGuard, TenantGuard } from './guards';

@Global()
@Module({
  providers: [
    PrismaService,
    RedisService,
    EntitlementsService,
    SiteCacheService,
    AuditService,
    WorkspaceService,
    AuthGuard,
    TenantGuard,
    SuperAdminGuard,
    AuthRateLimitGuard,
    // Deny-by-default: every route requires a session unless marked @Public().
    // In single-workspace mode the guard injects the system identity instead.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [
    PrismaService,
    RedisService,
    EntitlementsService,
    SiteCacheService,
    AuditService,
    WorkspaceService,
    AuthGuard,
    TenantGuard,
    SuperAdminGuard,
    AuthRateLimitGuard,
  ],
})
export class CommonModule {}
