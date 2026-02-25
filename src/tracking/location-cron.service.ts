import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class LocationCronService {
  private readonly logger = new Logger(LocationCronService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async persistLocations() {
    try {
      this.logger.debug('Running cron: persistLocations');

      // 1. Get all location keys from Redis
      const keys = await this.redis.keys('courier:*:location');
      if (!keys || keys.length === 0) return;

      const recordsToCreate = [];

      // 2. Fetch the data for each connected courier
      for (const key of keys) {
        const data = await this.redis.hgetall(key);
        if (!data || !data.lat || !data.lng || !data.profileId) continue;

        const courierId = String(data.profileId);

        // Ensure lat/lng are numbers
        const lat = Number(data.lat);
        const lng = Number(data.lng);

        if (!isNaN(lat) && !isNaN(lng)) {
          recordsToCreate.push({
            courierId,
            lat,
            lng,
          });
        }
      }

      // 3. Batch save to PostgreSQL
      if (recordsToCreate.length > 0) {
        await this.prisma.courierLocationHistory.createMany({
          data: recordsToCreate,
        });
        this.logger.debug(`Persisted ${recordsToCreate.length} courier locations to DB.`);
      }
    } catch (error) {
      this.logger.error('Failed to persist locations in cron job', error);
    }
  }
}
