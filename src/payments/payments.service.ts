import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // M-Pesa Daraja Config (Placeholder - should be in .env)
  private readonly darajaConfig = {
    consumerKey: process.env.DARAMA_CONSUMER_KEY,
    consumerSecret: process.env.DARAJA_CONSUMER_SECRET,
    shortCode: process.env.DARAJA_SHORTCODE,
    passKey: process.env.DARAJA_PASSKEY,
    callbackUrl: process.env.DARAJA_CALLBACK_URL,
  };

  async initiateStkPush(orderId: string, phoneNumber: string, amount: number) {
    // 1. Create a pending transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        parcelRequestId: orderId,
        amount,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PENDING,
        phoneNumber,
      },
    });

    // 2. For MVP/Simulation: auto-confirm the payment and transition order to PAID
    await this.simulatePaymentConfirmation(orderId, transaction.id);
    
    return {
      message: 'Payment successful (simulated)',
      transactionId: transaction.id,
      checkoutRequestId: 'ws_CO_000000000000000000' // Simulated ID
    };
  }

  async simulatePaymentConfirmation(orderId: string, transactionId: string) {
    // Update transaction to SUCCESS
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.SUCCESS },
    });

    // Transition the order to PAID
    await this.prisma.parcelRequest.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID },
    });
  }

  async handleMpesaCallback(payload: any) {
    const { Body } = payload;
    const stkCallback = Body.stkCallback;
    const resultCode = stkCallback.ResultCode;
    const merchantRequestId = stkCallback.MerchantRequestID;
    const checkoutRequestId = stkCallback.CheckoutRequestID;

    // Find the transaction (in real app, we use checkoutRequestId to find it)
    // For simulation, we'll need a way to link it. 
    // Usually we store MerchantRequestID and CheckoutRequestID in the Transaction record.

    if (resultCode === 0) {
      // Success!
      // Update transaction status and mark order as PAID
      // This is a critical state transition
      console.log('Payment successful');
      // await this.prisma.transaction.update(...)
      // await this.prisma.parcelRequest.update({ where: { id: orderId }, data: { status: OrderStatus.PAID } })
    } else {
      console.log('Payment failed', stkCallback.ResultDesc);
    }
  }

  async withdrawToMpesa(courierId: string, amount: number) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId: courierId },
    });

    if (!courier || courier.walletBalance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // 1. Deduct from wallet immediately (Escrow/Debit)
    await this.prisma.courierProfile.update({
      where: { userId: courierId },
      data: { walletBalance: { decrement: amount } },
    });

    // 2. Create payout transaction
    const user = await this.prisma.user.findUnique({ where: { id: courierId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        parcelRequestId: 'WITHDRAWAL', // Special case for withdrawals
        amount,
        type: TransactionType.PAYOUT,
        status: TransactionStatus.PENDING,
        phoneNumber: user.phoneNumber,
      },
    });

    // 3. Trigger B2C Payout via Daraja
    // console.log(`Triggering B2C for ${courierId} - Amount ${amount}`);

    return {
      message: 'Withdrawal requested and processing',
      transactionId: transaction.id,
    };
  }
}
