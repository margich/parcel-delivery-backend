import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('UPSTASH_REDIS_REST_URL');
    const token = this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN');

    if (!url || !token) {
      this.logger.warn('UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing. Redis functions will fail.');
    }

    this.redisClient = new Redis({
      url: url || '',
      token: token || '',
    });
  }

  getClient(): Redis {
    return this.redisClient;
  }

  async hset(key: string, data: Record<string, any>): Promise<number> {
    return await this.redisClient.hset(key, data);
  }

  async hgetall(key: string): Promise<Record<string, any> | null> {
    return await this.redisClient.hgetall(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.redisClient.keys(pattern);
  }

  async expire(key: string, seconds: number): Promise<number | 0> {
    return await this.redisClient.expire(key, seconds);
  }

  // Geospatial Support
  async geoadd(key: string, longitude: number, latitude: number, member: string): Promise<number> {
    const result = await this.redisClient.geoadd(key, { longitude, latitude, member });
    return result ?? 0;
  }

  async geosearch(key: string, longitude: number, latitude: number, radius: number, unit: 'km' | 'm' = 'km'): Promise<string[]> {
    // Upstash SDK geosearch expects from/by objects
    // Error hint: { type: "FROMLONLAT", coordinate: { lon: number, lat: number } }
    const results = await this.redisClient.geosearch(key, {
      type: "fromlonlat",
      coordinate: { lon: longitude, lat: latitude },
    }, {
      type: "byradius",
      radius,
      radiusType: (unit.toUpperCase() as "KM" | "M"),
    }, "ASC");
    
    if (!results || !Array.isArray(results)) return [];
    
    return results.map(res => {
      if (typeof res === 'string') return res;
      if (res && typeof res === 'object' && 'member' in res) return res.member as string;
      return String(res);
    });
  }

  // Atomic Locking Support
  async setLock(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redisClient.set(key, value, {
      nx: true,
      ex: ttlSeconds,
    });
    return result === 'OK';
  }

  async del(key: string): Promise<number> {
    return await this.redisClient.del(key);
  }
}
