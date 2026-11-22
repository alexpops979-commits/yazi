import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma, PrismaClient } from '../generated/client';

/**
 * Models that always belong to exactly one tenant. Every read/write through the
 * tenant-aware client is automatically constrained to the current tenant, so a
 * forgotten `where: { tenantId }` cannot leak another workspace's data.
 */
export const TENANT_SCOPED_MODELS = new Set<string>([
  'Membership',
  'Invitation',
  'Subscription',
  'Project',
  'ProjectDomain',
  'Page',
  'PageVersion',
  'MediaAsset',
  'PublishEvent',
  'PageViewDaily',
]);

/** Models intentionally outside automatic scoping (global or nullable tenant). */
export const UNSCOPED_MODELS = new Set<string>(['User', 'Tenant', 'Plan', 'Template', 'AuditLog']);

type TenantStore = { tenantId: string | null };

const storage = new AsyncLocalStorage<TenantStore>();

export class TenantScopeError extends Error {
  readonly code = 'TENANT_SCOPE';
  constructor(message: string) {
    super(message);
    this.name = 'TenantScopeError';
  }
}

export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  return storage.run({ tenantId }, fn);
}

/** Runs a callback with scoping disabled (system jobs, auth, admin, public resolution). */
export function runWithoutTenant<T>(fn: () => T): T {
  return storage.run({ tenantId: null }, fn);
}

export function currentTenantId(): string | null {
  return storage.getStore()?.tenantId ?? null;
}

const base = new PrismaClient({
  log: process.env.PRISMA_LOG === 'true' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

/** Unscoped client — only for auth, admin, tenant bootstrap and public host resolution. */
export const prismaRaw = base;

const WRITE_OPS = new Set([
  'create',
  'createMany',
  'upsert',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
]);

export const prisma = base.$extends({
  name: 'tenant-scope',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || !TENANT_SCOPED_MODELS.has(model)) {
          return query(args);
        }
        const tenantId = currentTenantId();
        if (!tenantId) {
          throw new TenantScopeError(
            `${model}.${operation} called outside a tenant context. Use runWithTenant() or the raw client explicitly.`,
          );
        }
        const a = (args ?? {}) as Record<string, unknown>;

        if (operation === 'create') {
          a.data = { ...(a.data as object), tenantId };
        } else if (operation === 'createMany') {
          const data = a.data as Record<string, unknown> | Record<string, unknown>[];
          a.data = Array.isArray(data)
            ? data.map((row) => ({ ...row, tenantId }))
            : { ...data, tenantId };
        } else if (operation === 'upsert') {
          a.where = { ...(a.where as object), tenantId };
          a.create = { ...(a.create as object), tenantId };
        } else if (WRITE_OPS.has(operation)) {
          a.where = { ...(a.where as object), tenantId };
        } else if (
          operation === 'findMany' ||
          operation === 'findFirst' ||
          operation === 'findFirstOrThrow' ||
          operation === 'findUnique' ||
          operation === 'findUniqueOrThrow' ||
          operation === 'count' ||
          operation === 'aggregate' ||
          operation === 'groupBy'
        ) {
          a.where = { ...(a.where as object | undefined), tenantId };
        }
        return query(a as never);
      },
    },
  },
});

export type Db = typeof prisma;
export type TransactionClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export { Prisma };
export type { PrismaClient };
