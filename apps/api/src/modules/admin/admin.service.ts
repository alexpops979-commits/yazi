import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AdminStats, AdminUserRow, PlanCode, PlanSummary } from '@yazi/contracts';
import { PrismaService } from '../../common/prisma.service';
import { NotFoundException, ConflictException } from '../../common/errors';
import { AuditService } from '../../common/audit.service';
import { BillingService } from '../billing/billing.service';
import { TemplatesService } from '../templates/templates.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly templates: TemplatesService,
    private readonly audit: AuditService,
  ) {}

  async users(search: string | undefined, page: number, pageSize = 20) {
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, rows] = await Promise.all([
      this.prisma.raw.user.count({ where }),
      this.prisma.raw.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          memberships: {
            include: { tenant: { select: { planCode: true } } },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
          _count: { select: { memberships: true } },
        },
      }),
    ]);

    const data: AdminUserRow[] = rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: row.status,
      planCode: (row.memberships[0]?.tenant.planCode as PlanCode | undefined) ?? null,
      createdAt: row.createdAt.toISOString(),
      projects: row._count.memberships,
    }));

    return { data, total, page, pageSize };
  }

  async updateUser(adminId: string, userId: string, input: { status?: string; role?: 'USER' | 'SUPER_ADMIN' }) {
    if (adminId === userId && input.role && input.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('You cannot demote yourself');
    }
    const user = await this.prisma.raw.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.raw.user.update({
      where: { id: userId },
      data: { ...(input.status ? { status: input.status } : {}), ...(input.role ? { role: input.role } : {}) },
    });
    await this.audit.record({
      actorId: adminId,
      action: 'admin.user.update',
      targetType: 'User',
      targetId: userId,
      meta: input,
    });
    return { id: updated.id, status: updated.status, role: updated.role };
  }

  async plans(): Promise<PlanSummary[]> {
    return this.billing.plans();
  }

  async upsertPlan(adminId: string, input: {
    code: string;
    name: string;
    description?: string | null;
    priceCents: number;
    currency?: string;
    interval?: 'MONTH' | 'YEAR';
    stripePriceId?: string | null;
    limits: unknown;
    isActive?: boolean;
    sortIndex?: number;
  }) {
    const data = {
      name: input.name,
      description: input.description ?? null,
      priceCents: input.priceCents,
      currency: input.currency ?? 'usd',
      interval: input.interval ?? 'MONTH',
      stripePriceId: input.stripePriceId ?? null,
      limits: input.limits as never,
      isActive: input.isActive ?? true,
      sortIndex: input.sortIndex ?? 0,
    };
    const plan = await this.prisma.raw.plan.upsert({
      where: { code: input.code },
      create: { code: input.code, ...data },
      update: data,
    });
    await this.audit.record({ actorId: adminId, action: 'admin.plan.upsert', targetType: 'Plan', targetId: plan.code });
    return plan;
  }

  async deletePlan(adminId: string, code: string) {
    const subscriptions = await this.prisma.raw.subscription.count({ where: { planCode: code } });
    if (subscriptions > 0) throw new ConflictException('Plan has active subscriptions');
    await this.prisma.raw.plan.delete({ where: { code } });
    await this.audit.record({ actorId: adminId, action: 'admin.plan.delete', targetType: 'Plan', targetId: code });
    return { ok: true };
  }

  async templatesList() {
    return this.templates.listAll();
  }

  async upsertTemplate(adminId: string, input: Parameters<TemplatesService['upsert']>[0]) {
    const template = await this.templates.upsert(input);
    await this.audit.record({ actorId: adminId, action: 'admin.template.upsert', targetType: 'Template', targetId: template.id });
    return template;
  }

  async deleteTemplate(adminId: string, id: string) {
    await this.templates.remove(id);
    await this.audit.record({ actorId: adminId, action: 'admin.template.delete', targetType: 'Template', targetId: id });
    return { ok: true };
  }

  async stats(): Promise<AdminStats> {
    const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    since.setHours(0, 0, 0, 0);

    const [users, tenants, projects, publishedPages, publishEvents, signups, subscriptions, plans] = await Promise.all([
      this.prisma.raw.user.count(),
      this.prisma.raw.tenant.count(),
      this.prisma.raw.project.count(),
      this.prisma.raw.page.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.raw.publishEvent.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.raw.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.raw.subscription.findMany({ select: { planCode: true, status: true } }),
      this.prisma.raw.plan.findMany({ select: { code: true, priceCents: true } }),
    ]);

    const dayKeys: string[] = [];
    for (let day = 0; day < 30; day += 1) {
      dayKeys.push(new Date(since.getTime() + day * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    }
    const publishes = new Map(dayKeys.map((key) => [key, 0]));
    for (const event of publishEvents) {
      const key = event.createdAt.toISOString().slice(0, 10);
      if (publishes.has(key)) publishes.set(key, (publishes.get(key) ?? 0) + 1);
    }
    const signupSeries = new Map(dayKeys.map((key) => [key, 0]));
    for (const user of signups) {
      const key = user.createdAt.toISOString().slice(0, 10);
      if (signupSeries.has(key)) signupSeries.set(key, (signupSeries.get(key) ?? 0) + 1);
    }

    const priceByCode = new Map(plans.map((plan) => [plan.code, plan.priceCents]));
    const activeSubscriptions = subscriptions.filter((sub) => sub.status === 'ACTIVE' || sub.status === 'TRIALING');
    const mrrCents = activeSubscriptions.reduce((sum, sub) => sum + (priceByCode.get(sub.planCode) ?? 0), 0);

    return {
      users,
      tenants,
      projects,
      publishedPages,
      mrrCents,
      activeSubscriptions: activeSubscriptions.length,
      publishesByDay: [...publishes.entries()].map(([date, count]) => ({ date, count })),
      signupsByDay: [...signupSeries.entries()].map(([date, count]) => ({ date, count })),
      planBreakdown: [...subscriptions.reduce((map, sub) => map.set(sub.planCode, (map.get(sub.planCode) ?? 0) + 1), new Map<string, number>()).entries()].map(
        ([planCode, count]) => ({ planCode, count }),
      ),
    };
  }

  async auditLog(tenantId?: string) {
    const rows = await this.prisma.raw.auditLog.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { actor: { select: { email: true, name: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      meta: row.meta,
      createdAt: row.createdAt.toISOString(),
      actor: row.actor?.email ?? null,
    }));
  }
}
