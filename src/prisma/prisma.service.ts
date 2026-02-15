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

  // Expose all Prisma client methods
  get user() {
    return this.prisma.user;
  }

  get courierProfile() {
    return this.prisma.courierProfile;
  }

  get parcelRequest() {
    return this.prisma.parcelRequest;
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
}
