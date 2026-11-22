import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../env';

type Entry = { value: string; expiresAt: number };

/**
 * Redis with an in-memory fallback so local development works without extra infra.
 * The fallback is single-process only — fine for dev, never for production.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private memory = new Map<string, Entry>();
  private usingMemory = false;

  constructor() {
    if (!env.redisUrl) {
      this.usingMemory = true;
      this.logger.warn('REDIS_URL is not set — using in-memory cache (dev only)');
      return;
    }
    const client = new Redis(env.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    });
    client.on('error', (error) => {
      if (!this.usingMemory) {
        this.logger.warn(`Redis error (${error.message}) — falling back to in-memory cache`);
        this.usingMemory = true;
      }
    });
    client.connect().catch(() => {
      this.usingMemory = true;
      this.logger.warn('Redis unavailable — using in-memory cache (dev only)');
    });
    this.client = client;
  }

  get isMemory(): boolean {
    return this.usingMemory;
  }

  async get(key: string): Promise<string | null> {
    if (this.client && !this.usingMemory) {
      try {
        return await this.client.get(key);
      } catch {
        /* fall through to memory */
      }
    }
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.client && !this.usingMemory) {
      try {
        if (ttlSeconds) await this.client.set(key, value, 'EX', ttlSeconds);
        else await this.client.set(key, value);
        return;
      } catch {
        /* fall through */
      }
    }
    this.memory.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : Number.MAX_SAFE_INTEGER,
    });
  }

  async del(...keys: string[]): Promise<void> {
    if (this.client && !this.usingMemory && keys.length) {
      try {
        await this.client.del(...keys);
        return;
      } catch {
        /* fall through */
      }
    }
    for (const key of keys) this.memory.delete(key);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (this.client && !this.usingMemory) {
      try {
        const value = await this.client.incr(key);
        if (value === 1 && ttlSeconds) await this.client.expire(key, ttlSeconds);
        return value;
      } catch {
        /* fall through */
      }
    }
    const current = Number((await this.get(key)) ?? '0') + 1;
    await this.set(key, String(current), ttlSeconds);
    return current;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client?.quit();
    } catch {
      /* ignore */
    }
  }
}
