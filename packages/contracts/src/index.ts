import { z } from 'zod';
import type { PageDocument } from '@yazi/page-schema';

/* ────────────────────────────────────────────────────────────
 *  Roles & plans
 * ──────────────────────────────────────────────────────────── */

export const MEMBERSHIP_ROLES = ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const PLAN_CODES = ['free', 'pro', 'business'] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export type PlanLimits = {
  projects: number;
  pagesPerProject: number;
  customDomains: number;
  storageMb: number;
  versionHistoryDays: number;
  removeBranding: boolean;
  customCode: boolean;
};

export const DEFAULT_LIMITS: Record<PlanCode, PlanLimits> = {
  free: {
    projects: 1,
    pagesPerProject: 3,
    customDomains: 0,
    storageMb: 100,
    versionHistoryDays: 7,
    removeBranding: false,
    customCode: false,
  },
  pro: {
    projects: 10,
    pagesPerProject: 50,
    customDomains: 3,
    storageMb: 5000,
    versionHistoryDays: 90,
    removeBranding: true,
    customCode: true,
  },
  business: {
    projects: 100,
    pagesPerProject: 500,
    customDomains: 25,
    storageMb: 50000,
    versionHistoryDays: 365,
    removeBranding: true,
    customCode: true,
  },
};

export const UNLIMITED_LIMITS: PlanLimits = {
  projects: 100000,
  pagesPerProject: 100000,
  customDomains: 100000,
  storageMb: 1000000,
  versionHistoryDays: 36500,
  removeBranding: true,
  customCode: true,
};

export const planLimitsSchema: z.ZodType<PlanLimits> = z.object({
  projects: z.number().int().min(0),
  pagesPerProject: z.number().int().min(0),
  customDomains: z.number().int().min(0),
  storageMb: z.number().int().min(0),
  versionHistoryDays: z.number().int().min(0),
  removeBranding: z.boolean(),
  customCode: z.boolean(),
});

export type EntitlementKey = keyof PlanLimits;

/* ────────────────────────────────────────────────────────────
 *  Auth
 * ──────────────────────────────────────────────────────────── */

const email = z.string().trim().toLowerCase().email().max(190);
const password = z.string().min(8).max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  password,
  workspaceName: z.string().trim().min(2).max(80).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({ email, password });
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  avatarUrl: z.string().url().max(500).nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
});

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: 'USER' | 'SUPER_ADMIN';
  emailVerifiedAt: string | null;
};

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  planCode: PlanCode;
  role: MembershipRole;
  trialEndsAt: string | null;
  createdAt: string;
};

export type MeResponse = {
  user: AuthUser;
  tenants: TenantSummary[];
};

/* ────────────────────────────────────────────────────────────
 *  Tenants
 * ──────────────────────────────────────────────────────────── */

export const createTenantSchema = z.object({ name: z.string().trim().min(2).max(80) });
export const updateTenantSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
});

export const inviteMemberSchema = z.object({
  email,
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
});

export type TenantMember = {
  id: string;
  userId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: MembershipRole;
  createdAt: string;
};

/* ────────────────────────────────────────────────────────────
 *  SEO
 * ──────────────────────────────────────────────────────────── */

export const seoSchema = z.object({
  title: z.string().max(160).optional(),
  description: z.string().max(320).optional(),
  ogImage: z.string().max(1000).optional(),
  keywords: z.string().max(300).optional(),
  noindex: z.boolean().optional(),
});
export type Seo = z.infer<typeof seoSchema>;

/* ────────────────────────────────────────────────────────────
 *  Slugs / hosts
 * ──────────────────────────────────────────────────────────── */

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Use latin letters, digits and dashes');

export const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'mail',
  'static',
  'cdn',
  'assets',
  'docs',
  'status',
  'blog',
  'preview',
  'dev',
  'staging',
  'test',
]);

/* ────────────────────────────────────────────────────────────
 *  Projects
 * ──────────────────────────────────────────────────────────── */

export const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(80),
  subdomain: slugSchema.optional(),
  templateId: z.string().min(1).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  subdomain: slugSchema.optional(),
  seo: seoSchema.optional(),
  faviconUrl: z.string().max(500).nullable().optional(),
  customCode: z.string().max(20000).optional(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export type ProjectSummary = {
  id: string;
  name: string;
  subdomain: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  theme: unknown;
  seo: Seo;
  faviconUrl: string | null;
  customCode: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  pageCount: number;
  publishedPageCount: number;
  domains: { host: string; kind: 'SUBDOMAIN' | 'CUSTOM'; verified: boolean; primary: boolean }[];
  siteUrl: string;
  hasUnpublishedChanges: boolean;
};

/* ────────────────────────────────────────────────────────────
 *  Pages
 * ──────────────────────────────────────────────────────────── */

export const pagePathSchema = z
  .string()
  .trim()
  .max(120)
  .regex(/^\/[a-z0-9\-/]*$/, 'Path must start with / and use latin letters, digits and dashes')
  .refine((p) => !p.includes('//'), 'Path cannot contain //');

export const createPageSchema = z.object({
  title: z.string().trim().min(1).max(120),
  path: pagePathSchema,
  templateId: z.string().min(1).optional(),
  fromPageId: z.string().min(1).optional(),
});
export type CreatePageInput = z.infer<typeof createPageSchema>;

export const updatePageSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  path: pagePathSchema.optional(),
  seo: seoSchema.optional(),
  sortIndex: z.number().int().min(0).optional(),
});
export type UpdatePageInput = z.infer<typeof updatePageSchema>;

export const saveDraftSchema = z.object({
  document: z.record(z.unknown()),
  revision: z.number().int().min(0),
});
export type SaveDraftInput = z.infer<typeof saveDraftSchema>;

export const publishSchema = z.object({ note: z.string().max(200).optional() });

export type PageSummary = {
  id: string;
  projectId: string;
  title: string;
  path: string;
  status: 'DRAFT' | 'PUBLISHED';
  seo: Seo;
  sortIndex: number;
  revision: number;
  publishedRevision: number | null;
  updatedAt: string;
  publishedAt: string | null;
};

export type PageDetail = PageSummary & {
  document: PageDocument;
  publishedVersion: number | null;
  isDirty: boolean;
};

export type PageVersionSummary = {
  id: string;
  version: number;
  note: string | null;
  createdAt: string;
  createdBy: string | null;
  isCurrentDraftSource: boolean;
};

/* ────────────────────────────────────────────────────────────
 *  Templates
 * ──────────────────────────────────────────────────────────── */

export const BLOCK_TYPES = [
  'section',
  'container',
  'columns',
  'grid',
  'heading',
  'text',
  'button',
  'badge',
  'divider',
  'spacer',
  'icon',
  'stat',
  'image',
  'video',
  'embed',
  'nav',
  'form',
] as const;

export const TEMPLATE_CATEGORIES = [
  'restaurant',
  'consulting',
  'agency',
  'shop',
  'personal',
  'saas',
  'other',
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const upsertTemplateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  category: z.enum(TEMPLATE_CATEGORIES),
  description: z.string().max(300).optional(),
  thumbnailUrl: z.string().max(1000).optional().nullable(),
  document: z.record(z.unknown()),
  isPublished: z.boolean().optional(),
  sortIndex: z.number().int().optional(),
});
export type UpsertTemplateInput = z.infer<typeof upsertTemplateSchema>;

export type TemplateSummary = {
  id: string;
  name: string;
  slug: string;
  category: TemplateCategory;
  description: string | null;
  thumbnailUrl: string | null;
  isSystem: boolean;
  isPublished: boolean;
  createdAt: string;
};

export type TemplateDetail = TemplateSummary & { document: PageDocument };

/* ────────────────────────────────────────────────────────────
 *  Media
 * ──────────────────────────────────────────────────────────── */

export type MediaAssetSummary = {
  id: string;
  url: string;
  filename: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string;
};

/* ────────────────────────────────────────────────────────────
 *  Domains
 * ──────────────────────────────────────────────────────────── */

export const addDomainSchema = z.object({
  host: z
    .string()
    .trim()
    .toLowerCase()
    .max(190)
    .regex(/^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/, 'Enter a valid domain, e.g. example.com'),
});
export type AddDomainInput = z.infer<typeof addDomainSchema>;

export type DomainSummary = {
  id: string;
  host: string;
  kind: 'SUBDOMAIN' | 'CUSTOM';
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  verifiedAt: string | null;
  verificationToken: string;
  isPrimary: boolean;
  instructions: { type: 'TXT' | 'A' | 'CNAME'; name: string; value: string }[];
};

/* ────────────────────────────────────────────────────────────
 *  Billing
 * ──────────────────────────────────────────────────────────── */

export type PlanSummary = {
  code: PlanCode;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  interval: 'MONTH' | 'YEAR';
  limits: PlanLimits;
  isActive: boolean;
  sortIndex: number;
};

export type SubscriptionSummary = {
  planCode: PlanCode;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeConfigured: boolean;
};

export type EntitlementsSummary = {
  planCode: PlanCode;
  limits: PlanLimits;
  usage: {
    projects: number;
    pages: number;
    customDomains: number;
    storageMb: number;
  };
};

export const checkoutSchema = z.object({ planCode: z.enum(PLAN_CODES) });

/* ────────────────────────────────────────────────────────────
 *  Public site payload
 * ──────────────────────────────────────────────────────────── */

export type PublicSitePayload = {
  project: {
    id: string;
    name: string;
    subdomain: string;
    faviconUrl: string | null;
    theme: unknown;
    seo: Seo;
    branding: boolean;
    customCode: string | null;
  };
  page: {
    id: string;
    path: string;
    title: string;
    seo: Seo;
    document: PageDocument;
    publishedVersion: number;
    updatedAt: string;
  };
  pages: { path: string; title: string }[];
};

/* ────────────────────────────────────────────────────────────
 *  Admin
 * ──────────────────────────────────────────────────────────── */

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'SUPER_ADMIN';
  status: string;
  planCode: PlanCode | null;
  createdAt: string;
  projects: number;
};

export type AdminStats = {
  users: number;
  tenants: number;
  projects: number;
  publishedPages: number;
  mrrCents: number;
  activeSubscriptions: number;
  publishesByDay: { date: string; count: number }[];
  signupsByDay: { date: string; count: number }[];
  planBreakdown: { planCode: string; count: number }[];
};

export type ApiError = { statusCode: number; message: string; code?: string; details?: unknown };
