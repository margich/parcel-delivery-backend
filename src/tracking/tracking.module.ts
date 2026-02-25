import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LocationCronService } from './location-cron.service';
import { TrackingGateway } from './tracking.gateway';

@Module({
  imports: [PrismaModule],
  providers: [TrackingGateway, LocationCronService],
  exports: [TrackingGateway],
})
export class TrackingModule {}
