import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(process.cwd(), '../../.env') });
loadEnv();

const siteDomainRaw = process.env.SITE_DOMAIN ?? 'lvh.me:3000';

export const env = {
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.API_PORT ?? 3001),
  publicUrl: process.env.API_PUBLIC_URL ?? 'http://localhost:3001',
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  appHost: process.env.APP_HOST ?? 'localhost:3000',
  siteDomain: siteDomainRaw,
  siteDomainHost: siteDomainRaw.split(':')[0]!.toLowerCase(),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me-please-0123456789abcdef',
  internalToken: process.env.INTERNAL_TOKEN ?? 'dev-internal-token-change-me',
  redisUrl: process.env.REDIS_URL ?? '',
  serverIp: process.env.SERVER_IP ?? '76.76.21.21',
  /** When false (default) every workspace gets all features and no limits. */
  plansEnforced: process.env.PLANS_ENFORCED === 'true',
  /** When true (default) accounts are disabled and one workspace is used. */
  singleWorkspace: process.env.SINGLE_WORKSPACE !== 'false',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? '',
    region: process.env.S3_REGION ?? 'auto',
    bucket: process.env.S3_BUCKET ?? '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    publicUrl: process.env.S3_PUBLIC_URL ?? '',
  },
} as const;

export const SESSION_COOKIE = 'yazi_session';
export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
export const TRIAL_DAYS = 14;
