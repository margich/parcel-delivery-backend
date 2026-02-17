import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string) {
    const totalOrders = await this.prisma.parcelRequest.count({
      where: { customerId: userId },
    });

    const totalSpentAggregate = await this.prisma.parcelRequest.aggregate({
      where: {
        customerId: userId,
        status: { not: OrderStatus.CANCELLED },
      },
      _sum: {
        price: true,
      },
    });

    const activeOrders = await this.prisma.parcelRequest.count({
      where: {
        customerId: userId,
        status: {
          in: [
            OrderStatus.CREATED,
            OrderStatus.PAID,
            OrderStatus.ACCEPTED,
            OrderStatus.ARRIVED_PICKUP,
            OrderStatus.PICKED_UP,
            OrderStatus.IN_TRANSIT,
            OrderStatus.ARRIVED_DROPOFF,
          ],
        },
      },
    });

    return {
      totalOrders,
      totalSpent: totalSpentAggregate._sum.price || 0,
      activeOrders,
    };
  }

  async getAddresses(userId: string) {
    return this.prisma.savedAddress.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addAddress(
    userId: string,
    data: { label: string; address: string; lat?: number; lng?: number },
  ) {
    return this.prisma.savedAddress.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const result = await this.prisma.savedAddress.deleteMany({
      where: {
        id: addressId,
        userId: userId,
      },
    });

    if (result.count === 0) {
      throw new Error('Address not found or unauthorized');
    }

    return { success: true };
  }
}
