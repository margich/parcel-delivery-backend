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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let PaymentsService = class PaymentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    darajaConfig = {
        consumerKey: process.env.DARAMA_CONSUMER_KEY,
        consumerSecret: process.env.DARAJA_CONSUMER_SECRET,
        shortCode: process.env.DARAJA_SHORTCODE,
        passKey: process.env.DARAJA_PASSKEY,
        callbackUrl: process.env.DARAJA_CALLBACK_URL,
    };
    async initiateStkPush(orderId, phoneNumber, amount) {
        const transaction = await this.prisma.transaction.create({
            data: {
                parcelRequestId: orderId,
                amount,
                type: client_1.TransactionType.DEPOSIT,
                status: client_1.TransactionStatus.PENDING,
                phoneNumber,
            },
        });
        await this.simulatePaymentConfirmation(orderId, transaction.id);
        return {
            message: 'Payment successful (simulated)',
            transactionId: transaction.id,
            checkoutRequestId: 'ws_CO_000000000000000000'
        };
    }
    async simulatePaymentConfirmation(orderId, transactionId) {
        await this.prisma.transaction.update({
            where: { id: transactionId },
            data: { status: client_1.TransactionStatus.SUCCESS },
        });
        await this.prisma.parcelRequest.update({
            where: { id: orderId },
            data: { status: client_1.OrderStatus.PAID },
        });
    }
    async handleMpesaCallback(payload) {
        const { Body } = payload;
        const stkCallback = Body.stkCallback;
        const resultCode = stkCallback.ResultCode;
        const merchantRequestId = stkCallback.MerchantRequestID;
        const checkoutRequestId = stkCallback.CheckoutRequestID;
        if (resultCode === 0) {
            console.log('Payment successful');
        }
        else {
            console.log('Payment failed', stkCallback.ResultDesc);
        }
    }
    async withdrawToMpesa(courierId, amount) {
        const courier = await this.prisma.courierProfile.findUnique({
            where: { userId: courierId },
        });
        if (!courier || courier.walletBalance < amount) {
            throw new common_1.BadRequestException('Insufficient wallet balance');
        }
        await this.prisma.courierProfile.update({
            where: { userId: courierId },
            data: { walletBalance: { decrement: amount } },
        });
        const user = await this.prisma.user.findUnique({ where: { id: courierId } });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        const transaction = await this.prisma.transaction.create({
            data: {
                parcelRequestId: 'WITHDRAWAL',
                amount,
                type: client_1.TransactionType.PAYOUT,
                status: client_1.TransactionStatus.PENDING,
                phoneNumber: user.phoneNumber,
            },
        });
        return {
            message: 'Withdrawal requested and processing',
            transactionId: transaction.id,
        };
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map