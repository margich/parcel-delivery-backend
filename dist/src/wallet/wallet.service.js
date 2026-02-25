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
    async getTransactions(userId) {
        const courier = await this.prisma.courierProfile.findUnique({
            where: { userId },
            include: {
                wallet: {
                    include: { ledgerEntries: { orderBy: { createdAt: 'desc' } } },
                },
            },
        });
        if (!courier || !courier.wallet)
            return [];
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
    async requestWithdrawal(userId, amount) {
        const courier = await this.prisma.courierProfile.findUnique({
            where: { userId },
            include: { wallet: true },
        });
        if (!courier || !courier.wallet) {
            throw new common_1.BadRequestException('Wallet not found');
        }
        const walletId = courier.wallet.id;
        if (Number(courier.wallet.balance) < amount) {
            throw new common_1.BadRequestException('Insufficient balance');
        }
        await this.prisma.$transaction(async (tx) => {
            const updatedWallet = await tx.wallet.update({
                where: { id: walletId },
                data: { balance: { decrement: amount } },
            });
            await tx.walletLedger.create({
                data: {
                    walletId: walletId,
                    type: client_1.TransactionType.PAYOUT,
                    amount,
                    balanceAfter: updatedWallet.balance,
                    reference: 'ManualWithdrawal',
                },
            });
        });
        return { success: true, message: 'Withdrawal requested', amount };
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WalletService);
//# sourceMappingURL=wallet.service.js.map