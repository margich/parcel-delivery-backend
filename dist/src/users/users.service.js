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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStats(userId) {
        const totalOrders = await this.prisma.parcelRequest.count({
            where: { customerId: userId },
        });
        const totalSpentAggregate = await this.prisma.parcelRequest.aggregate({
            where: {
                customerId: userId,
                status: { not: client_1.OrderStatus.CANCELLED },
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
                        client_1.OrderStatus.CREATED,
                        client_1.OrderStatus.PAID,
                        client_1.OrderStatus.ACCEPTED,
                        client_1.OrderStatus.ARRIVED_PICKUP,
                        client_1.OrderStatus.PICKED_UP,
                        client_1.OrderStatus.IN_TRANSIT,
                        client_1.OrderStatus.ARRIVED_DROPOFF,
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
    async getAddresses(userId) {
        return this.prisma.savedAddress.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async addAddress(userId, data) {
        return this.prisma.savedAddress.create({
            data: {
                userId,
                ...data,
            },
        });
    }
    async deleteAddress(userId, addressId) {
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map