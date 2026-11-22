import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../env';

export type AccessClaims = {
  sub: string;
  email: string;
  role: 'USER' | 'SUPER_ADMIN';
  ver: number;
  exp: number;
};

export type RefreshClaims = {
  sub: string;
  jti: string;
  ver: number;
  exp: number;
};

export type PreviewClaims = {
  sub: string;
  pageId: string;
  kind: 'preview';
  exp: number;
};

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

function createToken(payload: Record<string, unknown>, ttlSeconds: number): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  const signature = sign(`${header}.${body}`, env.jwtSecret);
  return `${header}.${body}.${signature}`;
}

function verifyToken<T>(token: string | undefined | null): T | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts as [string, string, string];
  const expected = sign(`${header}.${body}`, env.jwtSecret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T & { exp?: number };
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function signAccessToken(user: { id: string; email: string; role: 'USER' | 'SUPER_ADMIN' }, version = 0, ttl = 15 * 60): string {
  return createToken({ sub: user.id, email: user.email, role: user.role, ver: version }, ttl);
}

export function signRefreshToken(userId: string, version = 0): { token: string; jti: string; expiresIn: number } {
  const jti = randomBytes(18).toString('base64url');
  const expiresIn = 30 * 24 * 60 * 60;
  return { token: createToken({ sub: userId, jti, ver: version }, expiresIn), jti, expiresIn };
}

export function signPreviewToken(pageId: string, requestUserId: string, ttl = 60 * 60): string {
  return createToken({ sub: requestUserId, pageId, kind: 'preview' }, ttl);
}

export const verifyAccessToken = (token?: string | null) => verifyToken<AccessClaims>(token);
export const verifyRefreshToken = (token?: string | null) => verifyToken<RefreshClaims>(token);
export const verifyPreviewToken = (token?: string | null) => verifyToken<PreviewClaims>(token);

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function slugify(input: string, fallback = 'workspace'): string {
  const slug = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || fallback;
}

export function randomSuffix(length = 4): string {
  return randomBytes(8).toString('base64url').replace(/[^a-z0-9]/gi, '').slice(0, length).toLowerCase();
}
