import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, TransactionStatus, TransactionType } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingGateway } from '../tracking/tracking.gateway';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private trackingGateway: TrackingGateway,
    private configService: ConfigService,
  ) {}

  private get mpesaConfig() {
    return {
      consumerKey: this.configService.get<string>('MPESA_CONSUMER_KEY'),
      consumerSecret: this.configService.get<string>('MPESA_CONSUMER_SECRET'),
      businessShortCode: this.configService.get<string>('MPESA_BUSINESS_SHORT_CODE'),
      passkey: this.configService.get<string>('MPESA_PASSKEY'),
      callbackUrl: this.configService.get<string>('MPESA_CALLBACK_URL'),
      env: this.configService.get<string>('MPESA_ENV') || 'sandbox',
    };
  }

  async getAccessToken() {
    const { consumerKey, consumerSecret, env } = this.mpesaConfig;
    const url = env === 'sandbox' 
      ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Basic ${auth}` },
      });
      return response.data.access_token;
    } catch (error) {
      console.error('Mpesa Auth Error:', error.response?.data || error.message);
      throw new BadRequestException('Failed to authenticate with M-Pesa');
    }
  }

  // Initiate STK Push (Mpesa)
  async initiateStkPush(userId: string, orderData: any, phoneNumber: string, amount: number) {
    // Create a pending transaction without an orderId
    const transaction = await this.prisma.transaction.create({
      data: {
        type: TransactionType.DEPOSIT,
        amount: this.mpesaConfig.env === 'sandbox' ? 1 : amount,
        phoneNumber,
        status: TransactionStatus.PENDING,
        // Store order details in metadata for creation later
        gatewayResponse: {
          orderData,
          userId,
        } as any,
      },
    });

    // 2. Initiate STK Push
    const accessToken = await this.getAccessToken();
    const { businessShortCode, passkey, callbackUrl, env } = this.mpesaConfig;
    const url = env === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const password = Buffer.from(`${businessShortCode}${passkey}${timestamp}`).toString('base64');

    // Format phone number to 254XXXXXXXXX
    let formattedPhone = phoneNumber.replace(/\+/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
      formattedPhone = '254' + formattedPhone;
    }

    try {
      const response = await axios.post(
        url,
        {
          BusinessShortCode: businessShortCode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: this.mpesaConfig.env === 'sandbox' ? 1 : Math.round(amount),
          PartyA: formattedPhone,
          PartyB: businessShortCode,
          PhoneNumber: formattedPhone,
          CallBackURL: callbackUrl,
          AccountReference: `Order-New`,
          TransactionDesc: 'Parcel Delivery Payment',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      // Store checkout request ID and update metadata
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          gatewayResponse: {
            ...(transaction.gatewayResponse as any),
            CheckoutRequestID: response.data.CheckoutRequestID,
            MerchantRequestID: response.data.MerchantRequestID,
          } as any
        },
      });

      return {
        success: true,
        message: 'STK Push initiated',
        checkoutRequestId: response.data.CheckoutRequestID,
        transactionId: transaction.id,
      };
    } catch (error) {
      const errorMessage = error.response?.data?.errorMessage || 'Failed to initiate M-Pesa payment';
      console.error('STK Push Error:', error.response?.data || error.message);
      
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          status: TransactionStatus.FAILED,
          failureReason: errorMessage
        },
      });

      throw new BadRequestException(errorMessage);
    }
  }

  // Handle Mpesa Callback
  async handleMpesaCallback(body: any) {
    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      console.error('Invalid Mpesa callback structure', body);
      return { success: false, message: 'Invalid callback' };
    }

    const { CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;
    
    // Find transaction by CheckoutRequestID (stored in gatewayResponse)
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        gatewayResponse: {
          path: ['CheckoutRequestID'],
          equals: CheckoutRequestID,
        },
      },
    });

    if (!transaction) {
      console.error('Transaction not found for CheckoutRequestID:', CheckoutRequestID);
      return { success: false, message: 'Transaction not found' };
    }

    if (ResultCode !== 0) {
      console.log(`Payment failed: ${ResultDesc}`);
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          status: TransactionStatus.FAILED,
          gatewayResponse: body as any,
          failureReason: ResultDesc
        },
      });

      // Notify user of failure via socket
      const userId = (transaction.gatewayResponse as any)?.userId;
      if (userId) {
        this.trackingGateway.server.to(`user:${userId}`).emit('payment_failed', {
          message: ResultDesc,
          transactionId: transaction.id
        });
      }

      return { success: false, message: ResultDesc };
    }

    const callbackMetadata = stkCallback.CallbackMetadata?.Item;
    const mpesaReceiptNumber = callbackMetadata?.find(
      (item: any) => item.Name === 'MpesaReceiptNumber'
    )?.Value;

    // Payment Success - Create the Order now
    const metadata = transaction.gatewayResponse as any;
    const { orderData, userId } = metadata;

    let orderId: string;
    let createdOrder: any;

    try {
      createdOrder = await this.prisma.parcelRequest.create({
        data: {
          ...orderData,
          customerId: userId,
          status: OrderStatus.PAID,
        },
      });
      orderId = createdOrder.id;

      await this.prisma.orderStatusHistory.create({
        data: { parcelRequestId: orderId, status: OrderStatus.PAID },
      });
    } catch (error) {
      console.error('Failed to create order after payment:', error);
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { 
          status: TransactionStatus.SUCCESS,
          mpesaReference: mpesaReceiptNumber,
          failureReason: 'Order creation failed after successful payment'
        },
      });
      return { success: false, message: 'Internal error after payment' };
    }

    // Update transaction with orderId and success status
    const tx = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { 
        status: TransactionStatus.SUCCESS,
        mpesaReference: mpesaReceiptNumber,
        gatewayResponse: body as any,
        parcelRequestId: orderId
      },
    });

    // Notify nearby couriers and target user
    try {
      this.trackingGateway.broadcastStatusUpdate(orderId, OrderStatus.PAID);
      
      const nearbyCouriers = await this.trackingGateway.findNearbyCouriers(
        createdOrder.pickupLat,
        createdOrder.pickupLng,
        5 // 5km radius
      );

      if (nearbyCouriers.length > 0) {
        this.trackingGateway.notifyCouriersOfNewOrder(nearbyCouriers, createdOrder);
      }

      // Also notify the user specifically
      this.trackingGateway.server.to(`user:${userId}`).emit('order_created', {
        orderId,
        status: OrderStatus.PAID
      });

    } catch (error) {
      console.error('Failed to notify after order creation:', error);
    }
    
    return tx;
  }

  // Withdraw funds to Mpesa
  async withdrawToMpesa(courierId: string, amount: number) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId: courierId },
      include: { wallet: true },
    });

    if (!courier || !courier.wallet) {
      throw new NotFoundException('Wallet not found');
    }
    
    // Non-null assertion for TypeScript since we already checked above
    const walletId = courier.wallet.id;

    if (Number(courier.wallet.balance) < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Atomic update
    await this.prisma.$transaction(async (prisma) => {
      // 1. Decrement wallet balance
      const updatedWallet = await prisma.wallet.update({
        where: { id: walletId },
        data: { balance: { decrement: amount } },
      });

      // 2. Create Ledger Entry
      await prisma.walletLedger.create({
        data: {
          walletId: walletId,
          type: TransactionType.PAYOUT,
          amount,
          balanceAfter: updatedWallet.balance,
          reference: 'Mpesa Payout',
        },
      });
      
      // 3. (Optional) Create a global Transaction record
      // If you want to track payouts globally in the Transaction table, you could do it here
    });

    // Here you would call Mpesa payout API (B2C)

    return {
      success: true,
      message: 'Withdrawal request received',
      amount,
    };
  }
}
