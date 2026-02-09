import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { OrdersModule } from './orders/orders.module';
import { TrackingGateway } from './tracking/tracking.gateway';
import { PaymentsModule } from './payments/payments.module';
import { TrackingModule } from './tracking/tracking.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrdersModule,
    PaymentsModule,
    TrackingModule,
    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [AppService, TrackingGateway],
})
export class AppModule {}
