import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { LoginInput, MeResponse, RegisterInput, TenantSummary, UpdateProfileInput } from '@yazi/contracts';
import { hashPassword, verifyPassword } from '@yazi/db';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { AuditService } from '../../common/audit.service';
import { randomSuffix, signAccessToken, signRefreshToken, slugify, verifyRefreshToken } from '../../common/crypto';
import { TRIAL_DAYS } from '../../env';
import { NotFoundException, ConflictException } from '../../common/errors';

export type IssuedTokens = { accessToken: string; refreshToken: string; refreshExpiresIn: number };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async register(input: RegisterInput, ip?: string): Promise<{ tokens: IssuedTokens; me: MeResponse }> {
    const existing = await this.prisma.raw.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException('An account with this email already exists', 'EMAIL_TAKEN');

    const passwordHash = await hashPassword(input.password);
    const user = await this.prisma.raw.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });

    const workspaceName = input.workspaceName?.trim() || `${input.name.split(' ')[0]}'s workspace`;
    const slug = await this.uniqueTenantSlug(slugify(workspaceName));
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const tenant = await this.prisma.raw.tenant.create({
      data: { name: workspaceName, slug, planCode: 'free', trialEndsAt },
    });
    await this.prisma.raw.membership.create({ data: { tenantId: tenant.id, userId: user.id, role: 'OWNER' } });
    await this.prisma.raw.subscription.create({
      data: { tenantId: tenant.id, planCode: 'free', status: 'TRIALING', currentPeriodEnd: trialEndsAt },
    });
    await this.audit.record({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'auth.register',
      targetType: 'User',
      targetId: user.id,
      ip,
    });

    const tokens = await this.issue(user.id);
    return { tokens, me: await this.me(user.id) };
  }

  async login(input: LoginInput, ip?: string): Promise<{ tokens: IssuedTokens; me: MeResponse }> {
    const user = await this.prisma.raw.user.findUnique({ where: { email: input.email } });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');
    if (user.status !== 'active') throw new UnauthorizedException('Account is suspended');

    await this.audit.record({ actorId: user.id, action: 'auth.login', targetType: 'User', targetId: user.id, ip });
    const tokens = await this.issue(user.id);
    return { tokens, me: await this.me(user.id) };
  }

  async refresh(refreshToken: string | undefined): Promise<{ tokens: IssuedTokens; me: MeResponse }> {
    const claims = verifyRefreshToken(refreshToken);
    if (!claims) throw new UnauthorizedException('Session expired');
    const stored = await this.redis.get(`rt:${claims.jti}`);
    if (!stored || stored !== claims.sub) throw new UnauthorizedException('Session expired');
    if (claims.ver !== (await this.version(claims.sub))) throw new UnauthorizedException('Session expired');
    await this.redis.del(`rt:${claims.jti}`);
    const tokens = await this.issue(claims.sub);
    return { tokens, me: await this.me(claims.sub) };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    const claims = verifyRefreshToken(refreshToken);
    if (!claims) return;
    await this.redis.del(`rt:${claims.jti}`);
    // Invalidate every access token issued before this moment (all devices).
    await this.redis.incr(`authver:${claims.sub}`);
  }

  async issue(userId: string): Promise<IssuedTokens> {
    const user = await this.prisma.raw.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) throw new UnauthorizedException('Session expired');

    const version = await this.version(user.id);
    const refresh = signRefreshToken(user.id, version);
    await this.redis.set(`rt:${refresh.jti}`, user.id, refresh.expiresIn);
    return {
      accessToken: signAccessToken(user, version),
      refreshToken: refresh.token,
      refreshExpiresIn: refresh.expiresIn,
    };
  }

  /** Bumped on logout/password change to revoke outstanding access tokens immediately. */
  async version(userId: string): Promise<number> {
    return Number((await this.redis.get(`authver:${userId}`)) ?? '0') || 0;
  }

  async me(userId: string): Promise<MeResponse> {
    const user = await this.prisma.raw.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true, emailVerifiedAt: true },
    });
    if (!user) throw new UnauthorizedException('Session expired');

    const memberships = await this.prisma.raw.membership.findMany({
      where: { userId },
      include: { tenant: { select: { id: true, name: true, slug: true, planCode: true, trialEndsAt: true, createdAt: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const tenants: TenantSummary[] = memberships.map((membership) => ({
      id: membership.tenant.id,
      name: membership.tenant.name,
      slug: membership.tenant.slug,
      planCode: membership.tenant.planCode as TenantSummary['planCode'],
      role: membership.role,
      trialEndsAt: membership.tenant.trialEndsAt?.toISOString() ?? null,
      createdAt: membership.tenant.createdAt.toISOString(),
    }));

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      },
      tenants,
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    await this.prisma.raw.user.update({
      where: { id: userId },
      data: { ...(input.name ? { name: input.name } : {}), ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}) },
    });
    return this.me(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.raw.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');
    await this.prisma.raw.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
    // Revoke every existing session: refresh tokens and outstanding access tokens.
    await this.redis.incr(`authver:${userId}`);
  }

  private async uniqueTenantSlug(base: string): Promise<string> {
    let candidate = base;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const taken = await this.prisma.raw.tenant.findUnique({ where: { slug: candidate }, select: { id: true } });
      if (!taken) return candidate;
      candidate = `${base}-${randomSuffix(4)}`;
    }
    return `${base}-${Date.now().toString(36)}`;
  }
}
