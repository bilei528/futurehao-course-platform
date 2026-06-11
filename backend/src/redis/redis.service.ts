import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface MemoryEntry {
  value: string;
  expireAt?: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private memory = new Map<string, MemoryEntry>();
  private useMemory: boolean;

  constructor(private config: ConfigService) {
    this.useMemory =
      this.config.get('REDIS_MODE') === 'memory' ||
      this.config.get('LOCAL_DEV') === 'true';

    if (!this.useMemory) {
      this.client = new Redis({
        host: this.config.get('REDIS_HOST', '127.0.0.1'),
        port: Number(this.config.get('REDIS_PORT', 6379)),
        password: this.config.get('REDIS_PASSWORD') || undefined,
        db: Number(this.config.get('REDIS_DB', 0)),
        lazyConnect: true,
        retryStrategy: () => null,
      });
      this.client.connect().catch(() => {
        console.warn('[Redis] 连接失败，已自动切换为内存模式（适合本地验证）');
        this.client?.disconnect();
        this.client = null;
        this.useMemory = true;
      });
    }
  }

  private cleanupMemory() {
    const now = Date.now();
    for (const [key, entry] of this.memory.entries()) {
      if (entry.expireAt && entry.expireAt <= now) {
        this.memory.delete(key);
      }
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.useMemory || !this.client) {
      this.memory.set(key, {
        value,
        expireAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
      });
      return;
    }
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.useMemory || !this.client) {
      this.cleanupMemory();
      const entry = this.memory.get(key);
      if (!entry) return null;
      if (entry.expireAt && entry.expireAt <= Date.now()) {
        this.memory.delete(key);
        return null;
      }
      return entry.value;
    }
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    if (this.useMemory || !this.client) {
      this.memory.delete(key);
      return;
    }
    await this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    if (this.useMemory || !this.client) {
      const current = await this.get(key);
      const next = (Number(current) || 0) + 1;
      const entry = this.memory.get(key);
      await this.set(key, String(next), entry?.expireAt ? Math.ceil((entry.expireAt - Date.now()) / 1000) : undefined);
      return next;
    }
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (this.useMemory || !this.client) {
      const entry = this.memory.get(key);
      if (entry) {
        entry.expireAt = Date.now() + seconds * 1000;
      }
      return;
    }
    await this.client.expire(key, seconds);
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }
}
