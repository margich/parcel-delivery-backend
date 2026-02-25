"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const prisma_service_1 = require("../prisma/prisma.service");
const tracking_gateway_1 = require("../tracking/tracking.gateway");
let PaymentsService = class PaymentsService {
    prisma;
    trackingGateway;
    configService;
    constructor(prisma, trackingGateway, configService) {
        this.prisma = prisma;
        this.trackingGateway = trackingGateway;
        this.configService = configService;
    }
    get mpesaConfig() {
        return {
            consumerKey: this.configService.get('MPESA_CONSUMER_KEY'),
            consumerSecret: this.configService.get('MPESA_CONSUMER_SECRET'),
            businessShortCode: this.configService.get('MPESA_BUSINESS_SHORT_CODE'),
            passkey: this.configService.get('MPESA_PASSKEY'),
            callbackUrl: this.configService.get('MPESA_CALLBACK_URL'),
            env: this.configService.get('MPESA_ENV') || 'sandbox',
        };
    }
    async getAccessToken() {
        const { consumerKey, consumerSecret, env } = this.mpesaConfig;
        const url = env === 'sandbox'
            ? 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
            : 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        try {
            const response = await axios_1.default.get(url, {
                headers: { Authorization: `Basic ${auth}` },
            });
            return response.data.access_token;
        }
        catch (error) {
            console.error('Mpesa Auth Error:', error.response?.data || error.message);
            throw new common_1.BadRequestException('Failed to authenticate with M-Pesa');
        }
    }
    async initiateStkPush(userId, orderData, phoneNumber, amount) {
        const transaction = await this.prisma.transaction.create({
            data: {
                type: client_1.TransactionType.DEPOSIT,
                amount: this.mpesaConfig.env === 'sandbox' ? 1 : amount,
                phoneNumber,
                status: client_1.TransactionStatus.PENDING,
                gatewayResponse: {
                    orderData,
                    userId,
                },
            },
        });
        const accessToken = await this.getAccessToken();
        const { businessShortCode, passkey, callbackUrl, env } = this.mpesaConfig;
        const url = env === 'sandbox'
            ? 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
            : 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const password = Buffer.from(`${businessShortCode}${passkey}${timestamp}`).toString('base64');
        let formattedPhone = phoneNumber.replace(/\+/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.slice(1);
        }
        else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
            formattedPhone = '254' + formattedPhone;
        }
        try {
            const response = await axios_1.default.post(url, {
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
            }, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            await this.prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    gatewayResponse: {
                        ...transaction.gatewayResponse,
                        CheckoutRequestID: response.data.CheckoutRequestID,
                        MerchantRequestID: response.data.MerchantRequestID,
                    }
                },
            });
            return {
                success: true,
                message: 'STK Push initiated',
                checkoutRequestId: response.data.CheckoutRequestID,
                transactionId: transaction.id,
            };
        }
        catch (error) {
            const errorMessage = error.response?.data?.errorMessage || 'Failed to initiate M-Pesa payment';
            console.error('STK Push Error:', error.response?.data || error.message);
            await this.prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: client_1.TransactionStatus.FAILED,
                    failureReason: errorMessage
                },
            });
            throw new common_1.BadRequestException(errorMessage);
        }
    }
    async handleMpesaCallback(body) {
        const stkCallback = body?.Body?.stkCallback;
        if (!stkCallback) {
            console.error('Invalid Mpesa callback structure', body);
            return { success: false, message: 'Invalid callback' };
        }
        const { CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;
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
                    status: client_1.TransactionStatus.FAILED,
                    gatewayResponse: body,
                    failureReason: ResultDesc
                },
            });
            const userId = transaction.gatewayResponse?.userId;
            if (userId) {
                this.trackingGateway.server.to(`user:${userId}`).emit('payment_failed', {
                    message: ResultDesc,
                    transactionId: transaction.id
                });
            }
            return { success: false, message: ResultDesc };
        }
        const callbackMetadata = stkCallback.CallbackMetadata?.Item;
        const mpesaReceiptNumber = callbackMetadata?.find((item) => item.Name === 'MpesaReceiptNumber')?.Value;
        const metadata = transaction.gatewayResponse;
        const { orderData, userId } = metadata;
        let orderId;
        let createdOrder;
        try {
            createdOrder = await this.prisma.parcelRequest.create({
                data: {
                    ...orderData,
                    customerId: userId,
                    status: client_1.OrderStatus.PAID,
                },
            });
            orderId = createdOrder.id;
            await this.prisma.orderStatusHistory.create({
                data: { parcelRequestId: orderId, status: client_1.OrderStatus.PAID },
            });
        }
        catch (error) {
            console.error('Failed to create order after payment:', error);
            await this.prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: client_1.TransactionStatus.SUCCESS,
                    mpesaReference: mpesaReceiptNumber,
                    failureReason: 'Order creation failed after successful payment'
                },
            });
            return { success: false, message: 'Internal error after payment' };
        }
        const tx = await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                status: client_1.TransactionStatus.SUCCESS,
                mpesaReference: mpesaReceiptNumber,
                gatewayResponse: body,
                parcelRequestId: orderId
            },
        });
        try {
            this.trackingGateway.broadcastStatusUpdate(orderId, client_1.OrderStatus.PAID);
            const nearbyCouriers = await this.trackingGateway.findNearbyCouriers(createdOrder.pickupLat, createdOrder.pickupLng, 5);
            if (nearbyCouriers.length > 0) {
                this.trackingGateway.notifyCouriersOfNewOrder(nearbyCouriers, createdOrder);
            }
            this.trackingGateway.server.to(`user:${userId}`).emit('order_created', {
                orderId,
                status: client_1.OrderStatus.PAID
            });
        }
        catch (error) {
            console.error('Failed to notify after order creation:', error);
        }
        return tx;
    }
    async withdrawToMpesa(courierId, amount) {
        const courier = await this.prisma.courierProfile.findUnique({
            where: { userId: courierId },
            include: { wallet: true },
        });
        if (!courier || !courier.wallet) {
            throw new common_1.NotFoundException('Wallet not found');
        }
        const walletId = courier.wallet.id;
        if (Number(courier.wallet.balance) < amount) {
            throw new common_1.BadRequestException('Insufficient balance');
        }
        await this.prisma.$transaction(async (prisma) => {
            const updatedWallet = await prisma.wallet.update({
                where: { id: walletId },
                data: { balance: { decrement: amount } },
            });
            await prisma.walletLedger.create({
                data: {
                    walletId: walletId,
                    type: client_1.TransactionType.PAYOUT,
                    amount,
                    balanceAfter: updatedWallet.balance,
                    reference: 'Mpesa Payout',
                },
            });
        });
        return {
            success: true,
            message: 'Withdrawal request received',
            amount,
        };
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tracking_gateway_1.TrackingGateway,
        config_1.ConfigService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map