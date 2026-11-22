import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

const TTL_SECONDS = 5 * 60;

/**
 * Published sites are served from Redis; every publish bumps a per-project
 * version counter that is part of the cache key, so invalidation is O(1) and
 * cannot leave stale pages behind.
 */
@Injectable()
export class SiteCacheService {
  constructor(private readonly redis: RedisService) {}

  async version(projectId: string): Promise<string> {
    return (await this.redis.get(`sitever:${projectId}`)) ?? '0';
  }

  async invalidate(projectId: string): Promise<void> {
    await this.redis.incr(`sitever:${projectId}`);
  }

  private key(host: string, path: string, version: string): string {
    return `site:${host}:${path}:${version}`;
  }

  async get<T>(host: string, path: string, version: string): Promise<T | null> {
    return this.redis.getJson<T>(this.key(host, path, version));
  }

  async set(host: string, path: string, version: string, payload: unknown): Promise<void> {
    await this.redis.setJson(this.key(host, path, version), payload, TTL_SECONDS);
  }
}
