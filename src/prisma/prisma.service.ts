import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;
  private pool: Pool;

  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(this.pool);
    this.prisma = new PrismaClient({ adapter });
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    await this.pool.end();
  }

  get user() {
    return this.prisma.user;
  }

  get courierProfile() {
    return this.prisma.courierProfile;
  }

  get courierLocationHistory() {
    return this.prisma.courierLocationHistory;
  }

  get parcelRequest() {
    return this.prisma.parcelRequest;
  }

  get orderStatusHistory() {
    return this.prisma.orderStatusHistory;
  }

  get transaction() {
    return this.prisma.transaction;
  }

  get review() {
    return this.prisma.review;
  }

  get savedAddress() {
    return this.prisma.savedAddress;
  }

  get wallet() {
    return this.prisma.wallet;
  }

  get walletLedger() {
    return this.prisma.walletLedger;
  }

  get notification() {
    return this.prisma.notification;
  }

  get $transaction() {
    return this.prisma.$transaction.bind(this.prisma);
  }
}
