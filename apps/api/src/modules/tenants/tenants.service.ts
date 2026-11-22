import { ForbiddenException, Injectable } from '@nestjs/common';
import type { MembershipRole, TenantMember, TenantSummary } from '@yazi/contracts';
import { randomToken } from '@yazi/db';
import { PrismaService } from '../../common/prisma.service';
import { ConflictException, NotFoundException } from '../../common/errors';
import { randomSuffix, slugify } from '../../common/crypto';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listForUser(userId: string): Promise<TenantSummary[]> {
    const memberships = await this.prisma.raw.membership.findMany({
      where: { userId },
      include: { tenant: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((membership) => ({
      id: membership.tenant.id,
      name: membership.tenant.name,
      slug: membership.tenant.slug,
      planCode: membership.tenant.planCode as TenantSummary['planCode'],
      role: membership.role,
      trialEndsAt: membership.tenant.trialEndsAt?.toISOString() ?? null,
      createdAt: membership.tenant.createdAt.toISOString(),
    }));
  }

  async create(userId: string, name: string): Promise<TenantSummary> {
    let slug = slugify(name);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const taken = await this.prisma.raw.tenant.findUnique({ where: { slug }, select: { id: true } });
      if (!taken) break;
      slug = `${slugify(name)}-${randomSuffix(4)}`;
    }
    const tenant = await this.prisma.raw.tenant.create({ data: { name, slug, planCode: 'free' } });
    const membership = await this.prisma.raw.membership.create({
      data: { tenantId: tenant.id, userId, role: 'OWNER' },
    });
    await this.prisma.raw.subscription.create({
      data: { tenantId: tenant.id, planCode: 'free', status: 'ACTIVE' },
    });
    await this.audit.record({ tenantId: tenant.id, actorId: userId, action: 'tenant.create', targetType: 'Tenant', targetId: tenant.id });
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      planCode: tenant.planCode as TenantSummary['planCode'],
      role: membership.role,
      trialEndsAt: null,
      createdAt: tenant.createdAt.toISOString(),
    };
  }

  async rename(tenantId: string, name: string) {
    return this.prisma.raw.tenant.update({ where: { id: tenantId }, data: { name }, select: { id: true, name: true } });
  }

  async members(tenantId: string): Promise<TenantMember[]> {
    const rows = await this.prisma.raw.membership.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      email: row.user.email,
      name: row.user.name,
      avatarUrl: row.user.avatarUrl,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async invite(tenantId: string, actorId: string, email: string, role: MembershipRole) {
    const existingUser = await this.prisma.raw.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await this.prisma.raw.membership.findUnique({
        where: { tenantId_userId: { tenantId, userId: existingUser.id } },
      });
      if (existingMember) throw new ConflictException('This person is already a member');
    }

    const token = randomToken(24);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await this.prisma.raw.invitation.upsert({
      where: { tenantId_email: { tenantId, email } },
      create: { tenantId, email, role, token, expiresAt },
      update: { role, token, expiresAt, acceptedAt: null },
    });
    await this.audit.record({ tenantId, actorId, action: 'tenant.invite', targetType: 'Invitation', targetId: invitation.id, meta: { email, role } });
    return { id: invitation.id, email, role, token, expiresAt: expiresAt.toISOString() };
  }

  async invitations(tenantId: string) {
    const rows = await this.prisma.raw.invitation.findMany({ where: { tenantId, acceptedAt: null }, orderBy: { createdAt: 'desc' } });
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async revokeInvitation(tenantId: string, invitationId: string) {
    const invitation = await this.prisma.raw.invitation.findFirst({ where: { id: invitationId, tenantId } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    await this.prisma.raw.invitation.delete({ where: { id: invitationId } });
    return { ok: true };
  }

  async acceptInvitation(userId: string, token: string) {
    const invitation = await this.prisma.raw.invitation.findUnique({ where: { token }, include: { tenant: true } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.acceptedAt) throw new ConflictException('Invitation already used');
    if (invitation.expiresAt.getTime() < Date.now()) throw new ConflictException('Invitation expired');

    const user = await this.prisma.raw.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException('This invitation was issued for another email address');
    }

    await this.prisma.raw.membership.upsert({
      where: { tenantId_userId: { tenantId: invitation.tenantId, userId } },
      create: { tenantId: invitation.tenantId, userId, role: invitation.role },
      update: { role: invitation.role },
    });
    await this.prisma.raw.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
    return { tenantId: invitation.tenantId, name: invitation.tenant.name };
  }

  async removeMember(tenantId: string, actorId: string, membershipId: string) {
    const membership = await this.prisma.raw.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!membership) throw new NotFoundException('Member not found');
    if (membership.role === 'OWNER') throw new ForbiddenException('The owner cannot be removed');
    if (membership.userId === actorId) throw new ForbiddenException('You cannot remove yourself');
    await this.prisma.raw.membership.delete({ where: { id: membership.id } });
    await this.audit.record({ tenantId, actorId, action: 'tenant.member.remove', targetType: 'Membership', targetId: membership.id });
    return { ok: true };
  }

  async setMemberRole(tenantId: string, membershipId: string, role: MembershipRole) {
    const membership = await this.prisma.raw.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!membership) throw new NotFoundException('Member not found');
    if (membership.role === 'OWNER' && role !== 'OWNER') throw new ForbiddenException('Transfer ownership first');
    await this.prisma.raw.membership.update({ where: { id: membership.id }, data: { role } });
    return { ok: true };
  }
}
