import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { RedisService } from './redis.service';

const LIMIT = 60;
const WINDOW_SECONDS = 60;

/**
 * Brute-force protection for /auth/*: 60 attempts per minute per IP.
 * Uses Redis (or the in-memory fallback) — no extra dependency.
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? 'unknown';
    const count = await this.redis.incr(`rl:auth:${ip}`, WINDOW_SECONDS);
    if (count > LIMIT) {
      throw new HttpException(
        { statusCode: 429, code: 'RATE_LIMITED', message: 'Слишком много попыток. Повторите через минуту.' },
        429,
      );
    }
    return true;
  }
}
