import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PaymentRequiredException } from './errors';
import type { EntitlementKey, PlanCode, PlanLimits } from '@dalmg/contracts';
import { DEFAULT_LIMITS, UNLIMITED_LIMITS } from '@dalmg/contracts';
import { env } from '../env';

export type ResolvedEntitlements = {
  tenantId: string;
  planCode: PlanCode;
  limits: PlanLimits;
  isTrialing: boolean;
  usage: {
    projects: number;
    pages: number;
    customDomains: number;
    storageMb: number;
  };
};

const NEXT_PLAN: Record<PlanCode, PlanCode> = { free: 'pro', pro: 'business', business: 'business' };

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(tenantId: string): Promise<ResolvedEntitlements> {
    const [tenant, subscription, projects, pages, domains, media] = await Promise.all([
      this.prisma.raw.tenant.findUnique({ where: { id: tenantId }, select: { planCode: true, trialEndsAt: true } }),
      this.prisma.raw.subscription.findUnique({ where: { tenantId } }),
      this.prisma.raw.project.count({ where: { tenantId, status: { not: 'ARCHIVED' } } }),
      this.prisma.raw.page.count({ where: { tenantId } }),
      this.prisma.raw.projectDomain.count({ where: { tenantId, kind: 'CUSTOM' } }),
      this.prisma.raw.mediaAsset.aggregate({ where: { tenantId }, _sum: { size: true } }),
    ]);

    let planCode = (tenant?.planCode ?? 'free') as PlanCode;
    if (subscription && ['PAST_DUE', 'CANCELED', 'INCOMPLETE'].includes(subscription.status)) {
      planCode = 'free';
    }

    const plan = await this.prisma.raw.plan.findUnique({ where: { code: planCode } });
    const limits = env.plansEnforced
      ? ((plan?.limits as PlanLimits | undefined) ?? DEFAULT_LIMITS[planCode] ?? DEFAULT_LIMITS.free)
      : UNLIMITED_LIMITS;
    const isTrialing = !!tenant?.trialEndsAt && tenant.trialEndsAt.getTime() > Date.now() && planCode === 'free';

    return {
      tenantId,
      planCode,
      limits,
      isTrialing,
      usage: {
        projects,
        pages,
        customDomains: domains,
        storageMb: Math.ceil((media._sum.size ?? 0) / (1024 * 1024)),
      },
    };
  }

  /** Throws 402 with an upgrade hint — used by every limit-sensitive mutation. */
  async assert(tenantId: string, feature: EntitlementKey, delta = 1): Promise<ResolvedEntitlements> {
    const entitlements = await this.resolve(tenantId);
    if (!env.plansEnforced) return entitlements;
    const limit = entitlements.limits[feature];
    const current = this.currentValue(entitlements, feature);
    if (typeof limit === 'number' && current + delta > limit) {
      throw new PaymentRequiredException(feature, limit, entitlements.planCode, NEXT_PLAN[entitlements.planCode]);
    }
    if (limit === false && delta > 0) {
      throw new PaymentRequiredException(feature, 0, entitlements.planCode, NEXT_PLAN[entitlements.planCode]);
    }
    return entitlements;
  }

  /** Same as assert(), but the caller supplies the current count (e.g. pages inside one project). */
  async assertWithin(tenantId: string, feature: EntitlementKey, current: number): Promise<ResolvedEntitlements> {
    const entitlements = await this.resolve(tenantId);
    if (!env.plansEnforced) return entitlements;
    const limit = entitlements.limits[feature];
    if (typeof limit === 'number' && current + 1 > limit) {
      throw new PaymentRequiredException(feature, limit, entitlements.planCode, NEXT_PLAN[entitlements.planCode]);
    }
    if (limit === false) {
      throw new PaymentRequiredException(feature, 0, entitlements.planCode, NEXT_PLAN[entitlements.planCode]);
    }
    return entitlements;
  }

  private currentValue(entitlements: ResolvedEntitlements, feature: EntitlementKey): number {
    switch (feature) {
      case 'projects':
        return entitlements.usage.projects;
      case 'pagesPerProject':
        return 0;
      case 'customDomains':
        return entitlements.usage.customDomains;
      case 'storageMb':
        return entitlements.usage.storageMb;
      default:
        return 0;
    }
  }
}
