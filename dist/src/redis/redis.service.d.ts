import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';
export declare class RedisService {
    private configService;
    private readonly logger;
    private redisClient;
    constructor(configService: ConfigService);
    getClient(): Redis;
    hset(key: string, data: Record<string, any>): Promise<number>;
    hgetall(key: string): Promise<Record<string, any> | null>;
    keys(pattern: string): Promise<string[]>;
    expire(key: string, seconds: number): Promise<number | 0>;
    geoadd(key: string, longitude: number, latitude: number, member: string): Promise<number>;
    geosearch(key: string, longitude: number, latitude: number, radius: number, unit?: 'km' | 'm'): Promise<string[]>;
    setLock(key: string, value: string, ttlSeconds: number): Promise<boolean>;
    del(key: string): Promise<number>;
}
