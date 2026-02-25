import { BadRequestException, Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getBalance(userId: string) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId },
      include: {
        wallet: {
          include: {
            ledgerEntries: { orderBy: { createdAt: 'desc' }, take: 10 },
          },
        },
      },
    });

    if (!courier || !courier.wallet) {
      return { balance: 0, currency: 'KES', transactions: [] };
    }

    return {
      balance: Number(courier.wallet.balance),
      currency: 'KES',
      transactions: courier.wallet.ledgerEntries.map((entry) => ({
        id: entry.id,
        type: entry.type,
        amount: Number(entry.amount),
        balanceAfter: Number(entry.balanceAfter),
        date: entry.createdAt,
        reference: entry.reference || undefined,
        status: 'COMPLETED',
      })),
    };
  }

  async getTransactions(userId: string) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId },
      include: {
        wallet: {
          include: { ledgerEntries: { orderBy: { createdAt: 'desc' } } },
        },
      },
    });

    if (!courier || !courier.wallet) return [];

    return courier.wallet.ledgerEntries.map((entry) => ({
      id: entry.id,
      type: entry.type,
      amount: Number(entry.amount),
      balanceAfter: Number(entry.balanceAfter),
      date: entry.createdAt,
      reference: entry.reference || undefined,
      status: 'COMPLETED',
    }));
  }

  async requestWithdrawal(userId: string, amount: number) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId },
      include: { wallet: true },
    });

    if (!courier || !courier.wallet) {
      throw new BadRequestException('Wallet not found');
    }
    
    // Non-null assertion for TypeScript since we already checked above
    const walletId = courier.wallet.id;

    if (Number(courier.wallet.balance) < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Decrement balance and add ledger entry atomically
    await this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { decrement: amount } },
      });

      await tx.walletLedger.create({
        data: {
          walletId: walletId,
          type: TransactionType.PAYOUT,
          amount,
          balanceAfter: updatedWallet.balance,
          reference: 'ManualWithdrawal',
        },
      });
    });

    return { success: true, message: 'Withdrawal requested', amount };
  }
}
