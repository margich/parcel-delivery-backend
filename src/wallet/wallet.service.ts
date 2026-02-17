import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: string) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId },
    });

    if (!courier) {
      // Return default balance for users without a courier profile
      return {
        balance: 0,
        currency: 'KES',
      };
    }

    return {
      balance: courier.walletBalance,
      currency: 'KES',
    };
  }

  async getTransactions(userId: string) {
    // Basic transaction history logic
    // We can fetch from a Transaction table if we link it to Courier,
    // or calculate from completed orders for now.
    // For MVP, let's fetch completed orders as "Earnings"

    const earnings = await this.prisma.parcelRequest.findMany({
      where: {
        courierId: userId,
        status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return earnings.map((order: any) => ({
      id: order.id,
      type: 'EARNING',
      amount: order.price, // Assuming full price for now, minus commission later
      date: order.updatedAt,
      reference: `Order #${order.id.substring(0, 8)}`,
      status: 'COMPLETED',
    }));
  }

  async requestWithdrawal(userId: string, amount: number) {
    // Mock withdrawal
    return {
      success: true,
      message: 'Withdrawal request received',
      amount,
    };
  }
}
