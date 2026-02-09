import { Module } from '@nestjs/common';
import { TrackingModule } from '../tracking/tracking.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [TrackingModule],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
