import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
export declare class LocationCronService {
    private readonly redis;
    private readonly prisma;
    private readonly logger;
    constructor(redis: RedisService, prisma: PrismaService);
    persistLocations(): Promise<void>;
}
