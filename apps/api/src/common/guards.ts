import {
  BadRequestException,
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  type PipeTransform,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';
import type { MembershipRole } from '@dalmg/contracts';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { parseCookies, verifyAccessToken } from './crypto';
import { getDefaultWorkspace } from './workspace';
import { env } from '../env';
import { splitSession } from './http';
import { SESSION_COOKIE } from '../env';

export type AuthUserContext = {
  id: string;
  email: string;
  role: 'USER' | 'SUPER_ADMIN';
};

declare module 'express' {
  interface Request {
    user?: AuthUserContext;
    tenantId?: string;
    tenantRole?: MembershipRole;
  }
}

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const MIN_ROLE = 'minRole';
export const MinRole = (role: MembershipRole) => SetMetadata(MIN_ROLE, role);

const ROLE_RANK: Record<MembershipRole, number> = { VIEWER: 1, EDITOR: 2, ADMIN: 3, OWNER: 4 };

export function canWrite(role: MembershipRole | undefined): boolean {
  return !!role && ROLE_RANK[role] >= ROLE_RANK.EDITOR;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();

    // Accounts removed: one seeded workspace, no session required.
    if (env.singleWorkspace) {
      const workspace = getDefaultWorkspace();
      if (!workspace) throw new UnauthorizedException('Workspace is not ready');
      request.user = { id: workspace.userId, email: 'system@dalmg.local', role: 'SUPER_ADMIN' };
      return true;
    }

    const cookies = parseCookies(request.headers.cookie);
    const bearer = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.slice(7)
      : undefined;
    const { accessToken } = splitSession(cookies[SESSION_COOKIE]);
    const claims = verifyAccessToken(bearer ?? accessToken);
    if (!claims) throw new UnauthorizedException('Session expired');

    const version = Number((await this.redis.get(`authver:${claims.sub}`)) ?? '0') || 0;
    if ((claims.ver ?? 0) !== version) throw new UnauthorizedException('Session expired');

    return this.attach(request, claims.sub);
  }

  /** Used by the refresh flow as well: validates the user still exists and is active. */
  async attach(request: Request, userId: string): Promise<boolean> {
    const user = await this.prisma.raw.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!user) throw new UnauthorizedException('Session expired');
    if (user.status !== 'active') throw new ForbiddenException('Account is suspended');
    request.user = { id: user.id, email: user.email, role: user.role };
    return true;
  }
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    if (env.singleWorkspace) {
      const workspace = getDefaultWorkspace();
      if (!workspace) throw new ForbiddenException('Workspace is not ready');
      const singleRequest = context.switchToHttp().getRequest<Request>();
      singleRequest.user ??= { id: workspace.userId, email: 'system@dalmg.local', role: 'SUPER_ADMIN' };
      singleRequest.tenantId = workspace.tenantId;
      singleRequest.tenantRole = 'OWNER';
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) throw new UnauthorizedException();

    const header = request.headers['x-tenant-id'];
    const tenantId = typeof header === 'string' ? header : Array.isArray(header) ? header[0] : undefined;
    if (!tenantId) throw new BadRequestException('Missing X-Tenant-Id header');

    const membership = await this.prisma.raw.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId: request.user.id } },
      select: { role: true, tenantId: true },
    });
    if (!membership) throw new ForbiddenException('No access to this workspace');

    request.tenantId = membership.tenantId;
    request.tenantRole = membership.role;

    const minRole = this.reflector.getAllAndOverride<MembershipRole>(MIN_ROLE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (minRole && ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
      throw new ForbiddenException(`Requires ${minRole} role`);
    }
    return true;
  }
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (env.singleWorkspace) return true;
    const request = context.switchToHttp().getRequest<Request>();
    if (request.user?.role !== 'SUPER_ADMIN') throw new ForbiddenException('Super admin only');
    return true;
  }
}

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          code: 'VALIDATION',
          details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
        });
      }
      throw error;
    }
  }
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUserContext => {
  const request = ctx.switchToHttp().getRequest<Request>();
  if (!request.user) throw new UnauthorizedException();
  return request.user;
});

export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request>();
  if (!request.tenantId) throw new ForbiddenException('No tenant context');
  return request.tenantId;
});

export const TenantRole = createParamDecorator((_data: unknown, ctx: ExecutionContext): MembershipRole => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.tenantRole ?? 'VIEWER';
});
