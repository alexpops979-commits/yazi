import type { Response } from 'express';
import { REFRESH_TTL_SECONDS, SESSION_COOKIE, env } from '../env';

const base = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.isProd,
  path: '/',
};

/**
 * Access + refresh tokens travel in a single cookie. Two Set-Cookie headers can be
 * collapsed into one by proxies (and then rejected by browsers), so one header with
 * a `|` separator is both simpler and more portable.
 */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(SESSION_COOKIE, `${accessToken}|${refreshToken}`, { ...base, maxAge: REFRESH_TTL_SECONDS * 1000 });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(SESSION_COOKIE, base);
}

export function splitSession(value: string | undefined): { accessToken?: string; refreshToken?: string } {
  if (!value) return {};
  const separator = value.indexOf('|');
  if (separator === -1) return { accessToken: value };
  return { accessToken: value.slice(0, separator), refreshToken: value.slice(separator + 1) };
}

export function clientIp(request: { headers: Record<string, unknown>; ip?: string }): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0]!.trim();
  return request.ip ?? 'unknown';
}
