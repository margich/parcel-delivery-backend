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
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let WalletService = class WalletService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getBalance(userId) {
        const courier = await this.prisma.courierProfile.findUnique({
            where: { userId },
        });
        if (!courier) {
            throw new Error('Courier profile not found');
        }
        return {
            balance: courier.walletBalance,
            currency: 'KES',
        };
    }
    async getTransactions(userId) {
        const earnings = await this.prisma.parcelRequest.findMany({
            where: {
                courierId: userId,
                status: { in: [client_1.OrderStatus.DELIVERED, client_1.OrderStatus.COMPLETED] },
            },
            orderBy: { updatedAt: 'desc' },
            take: 20,
        });
        return earnings.map(order => ({
            id: order.id,
            type: 'EARNING',
            amount: order.price,
            date: order.updatedAt,
            reference: `Order #${order.id.substring(0, 8)}`,
            status: 'COMPLETED',
        }));
    }
    async requestWithdrawal(userId, amount) {
        return {
            success: true,
            message: 'Withdrawal request received',
            amount,
        };
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WalletService);
//# sourceMappingURL=wallet.service.js.map