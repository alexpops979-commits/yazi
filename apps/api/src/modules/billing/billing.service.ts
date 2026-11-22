import { HttpException, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import type {
  EntitlementsSummary,
  PlanCode,
  PlanLimits,
  PlanSummary,
  SubscriptionSummary,
} from '@yazi/contracts';
import { planLimitsSchema } from '@yazi/contracts';
import { PrismaService } from '../../common/prisma.service';
import { EntitlementsService } from '../../common/entitlements.service';
import { AuditService } from '../../common/audit.service';
import { NotFoundException } from '../../common/errors';
import { env } from '../../env';

type StripeSub = Stripe.Subscription;

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly audit: AuditService,
  ) {
    this.stripe = env.stripe.secretKey ? new Stripe(env.stripe.secretKey) : null;
  }

  get stripeConfigured(): boolean {
    return !!this.stripe;
  }

  async plans(): Promise<PlanSummary[]> {
    const rows = await this.prisma.raw.plan.findMany({ orderBy: { sortIndex: 'asc' } });
    return rows.map((row) => ({
      code: row.code as PlanCode,
      name: row.name,
      description: row.description,
      priceCents: row.priceCents,
      currency: row.currency,
      interval: row.interval,
      limits: planLimitsSchema.parse(row.limits) as PlanLimits,
      isActive: row.isActive,
      sortIndex: row.sortIndex,
    }));
  }

  async subscription(tenantId: string): Promise<SubscriptionSummary> {
    const subscription = await this.prisma.raw.subscription.findUnique({ where: { tenantId } });
    return {
      planCode: (subscription?.planCode ?? 'free') as PlanCode,
      status: subscription?.status ?? 'ACTIVE',
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      stripeConfigured: this.stripeConfigured,
    };
  }

  async entitlementsSummary(tenantId: string): Promise<EntitlementsSummary> {
    const resolved = await this.entitlements.resolve(tenantId);
    return { planCode: resolved.planCode, limits: resolved.limits, usage: resolved.usage };
  }

  async checkout(tenantId: string, userId: string, planCode: PlanCode): Promise<{ url: string; mock: boolean }> {
    if (!env.plansEnforced) {
      throw new HttpException({ statusCode: 403, code: 'PLANS_DISABLED', message: 'Тарифы отключены: все функции доступны бесплатно' }, 403);
    }
    const plan = await this.prisma.raw.plan.findUnique({ where: { code: planCode } });
    if (!plan) throw new NotFoundException('Plan not found');
    if (planCode === 'free') throw new HttpException({ statusCode: 400, message: 'Cannot check out the free plan' }, 400);

    // Dev/demo mode: switch instantly so the whole flow is testable without Stripe keys.
    if (!this.stripe) {
      await this.applyPlan(tenantId, planCode, 'ACTIVE', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), false);
      await this.audit.record({ tenantId, actorId: userId, action: 'billing.mock_upgrade', targetType: 'Tenant', targetId: tenantId, meta: { planCode } });
      return { url: `${env.appUrl}/billing?mock=1`, mock: true };
    }

    if (!plan.stripePriceId) {
      throw new HttpException({ statusCode: 400, message: `Stripe price for "${plan.code}" is not configured` }, 400);
    }

    const tenant = await this.prisma.raw.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Workspace not found');
    const owner = await this.prisma.raw.user.findUnique({ where: { id: userId } });

    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: owner?.email,
        name: tenant.name,
        metadata: { tenantId },
      });
      customerId = customer.id;
      await this.prisma.raw.tenant.update({ where: { id: tenantId }, data: { stripeCustomerId: customerId } });
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${env.appUrl}/billing?checkout=success`,
      cancel_url: `${env.appUrl}/billing?checkout=cancel`,
      allow_promotion_codes: true,
      metadata: { tenantId, planCode },
      subscription_data: { metadata: { tenantId, planCode } },
    });

    return { url: session.url ?? `${env.appUrl}/billing`, mock: false };
  }

  async portal(tenantId: string): Promise<{ url: string }> {
    if (!env.plansEnforced) {
      throw new HttpException({ statusCode: 403, code: 'PLANS_DISABLED', message: 'Тарифы отключены' }, 403);
    }
    if (!this.stripe) {
      return { url: `${env.appUrl}/billing?mock=1` };
    }
    const tenant = await this.prisma.raw.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.stripeCustomerId) throw new NotFoundException('No billing account yet');
    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${env.appUrl}/billing`,
    });
    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined): Promise<{ received: boolean }> {
    if (!this.stripe || !env.stripe.webhookSecret) {
      this.logger.warn('Stripe webhook received but Stripe is not configured');
      return { received: false };
    }
    if (!rawBody || !signature) throw new HttpException({ statusCode: 400, message: 'Missing signature' }, 400);

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);
    } catch (error) {
      this.logger.warn(`Stripe signature verification failed: ${(error as Error).message}`);
      throw new HttpException({ statusCode: 400, message: 'Invalid signature' }, 400);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const tenantId = session.metadata?.tenantId;
          if (tenantId && session.subscription) {
            const subscription = await this.stripe.subscriptions.retrieve(String(session.subscription));
            await this.syncSubscription(tenantId, subscription);
          }
          break;
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as StripeSub;
          const tenantId = await this.resolveTenantId(subscription);
          if (tenantId) await this.syncSubscription(tenantId, subscription);
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
          if (customerId) {
            const tenant = await this.prisma.raw.tenant.findFirst({ where: { stripeCustomerId: customerId } });
            if (tenant) {
              await this.prisma.raw.subscription.updateMany({
                where: { tenantId: tenant.id },
                data: { status: 'PAST_DUE' },
              });
            }
          }
          break;
        }
        default:
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to process Stripe event ${event.type}: ${(error as Error).message}`);
      throw new HttpException({ statusCode: 500, message: 'Webhook processing failed' }, 500);
    }

    return { received: true };
  }

  /** Used by the seeded/dev mode and by the admin panel. */
  async applyPlan(
    tenantId: string,
    planCode: PlanCode,
    status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE',
    currentPeriodEnd: Date | null,
    cancelAtPeriodEnd: boolean,
    stripeSubscriptionId?: string | null,
  ): Promise<void> {
    await this.prisma.raw.tenant.update({ where: { id: tenantId }, data: { planCode } });
    await this.prisma.raw.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        planCode,
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        stripeSubscriptionId: stripeSubscriptionId ?? null,
      },
      update: {
        planCode,
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        ...(stripeSubscriptionId !== undefined ? { stripeSubscriptionId } : {}),
      },
    });
  }

  private async resolveTenantId(subscription: StripeSub): Promise<string | null> {
    const fromMetadata = subscription.metadata?.tenantId;
    if (fromMetadata) return fromMetadata;
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const tenant = await this.prisma.raw.tenant.findFirst({ where: { stripeCustomerId: customerId } });
    return tenant?.id ?? null;
  }

  private async syncSubscription(tenantId: string, subscription: StripeSub): Promise<void> {
    const priceId = subscription.items.data[0]?.price?.id;
    const plan = priceId ? await this.prisma.raw.plan.findFirst({ where: { stripePriceId: priceId } }) : null;
    const planCode = (plan?.code ?? subscription.metadata?.planCode ?? 'free') as PlanCode;

    const statusMap: Record<string, 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE'> = {
      active: 'ACTIVE',
      trialing: 'TRIALING',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      incomplete: 'INCOMPLETE',
      incomplete_expired: 'CANCELED',
      unpaid: 'PAST_DUE',
      paused: 'CANCELED',
    };
    const status = statusMap[subscription.status] ?? 'INCOMPLETE';
    const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;

    await this.applyPlan(
      tenantId,
      status === 'CANCELED' ? 'free' : planCode,
      status,
      periodEnd,
      subscription.cancel_at_period_end,
      subscription.id,
    );
    await this.audit.record({
      tenantId,
      action: 'billing.subscription_sync',
      targetType: 'Subscription',
      targetId: subscription.id,
      meta: { planCode, status },
    });
  }
}
