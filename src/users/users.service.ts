import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { courierProfile: true },
    });

    if (user?.role === 'COURIER' || user?.activeRole === 'COURIER') {
      const totalJobs = await this.prisma.parcelRequest.count({
        where: { courierId: userId },
      });

      const totalEarnedAggregate = await this.prisma.parcelRequest.aggregate({
        where: {
          courierId: userId,
          status: { not: OrderStatus.CANCELLED },
        },
        _sum: {
          courierEarning: true,
        },
      });

      const activeJobs = await this.prisma.parcelRequest.count({
        where: {
          courierId: userId,
          status: {
            in: [
              OrderStatus.ACCEPTED,
              OrderStatus.ARRIVED_PICKUP,
              OrderStatus.PICKED_UP,
              OrderStatus.IN_TRANSIT,
              OrderStatus.ARRIVED_DROPOFF,
            ],
          },
        },
      });

      const averageRating = user.courierProfile?.overallRating
        ? Number(user.courierProfile.overallRating)
        : 5.0;

      return {
        totalJobs,
        totalEarned: totalEarnedAggregate._sum.courierEarning || 0,
        averageRating,
        activeJobs,
        ratingCount: user.courierProfile?.ratingCount || 0,
        ratingSum: user.courierProfile?.ratingSum || 0,
      };
    }

    // Customer stats
    const totalOrders = await this.prisma.parcelRequest.count({
      where: { customerId: userId },
    });

    const totalSpentAggregate = await this.prisma.parcelRequest.aggregate({
      where: {
        customerId: userId,
        status: { not: OrderStatus.CANCELLED },
      },
      _sum: {
        totalPrice: true,
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
      totalSpent: totalSpentAggregate._sum.totalPrice || 0,
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
