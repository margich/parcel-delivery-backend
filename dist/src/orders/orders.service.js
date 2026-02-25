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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const tracking_gateway_1 = require("../tracking/tracking.gateway");
let OrdersService = class OrdersService {
    prisma;
    redis;
    trackingGateway;
    constructor(prisma, redis, trackingGateway) {
        this.prisma = prisma;
        this.redis = redis;
        this.trackingGateway = trackingGateway;
    }
    async getPricing() {
        return { baseFare: 100, perKm: 20 };
    }
    async getMyOrders(userId) {
        return this.prisma.parcelRequest.findMany({
            where: { OR: [{ customerId: userId }, { courierId: userId }] },
            orderBy: { createdAt: 'desc' },
            include: {
                customer: true,
                courier: {
                    include: {
                        courierProfile: true,
                    },
                },
                statusHistory: { orderBy: { createdAt: 'asc' } },
                reviews: true,
                transactions: true,
            },
        });
    }
    async create(userId, orderDto) {
        const { pickupAddress, pickupLat, pickupLng, dropoffAddress, dropoffLat, dropoffLng, vehicleType, packageType, instructions, parcelPhotoUrl, fixedPrice, platformFee, courierEarning, totalPrice, } = orderDto;
        return this.prisma.parcelRequest.create({
            data: {
                customerId: userId,
                pickupAddress,
                pickupLat,
                pickupLng,
                dropoffAddress,
                dropoffLat,
                dropoffLng,
                vehicleType,
                packageType,
                instructions,
                parcelPhotoUrl,
                fixedPrice,
                platformFee,
                courierEarning,
                totalPrice,
                status: client_1.OrderStatus.CREATED,
            },
        });
    }
    async getAvailableOrders(userId) {
        return this.prisma.parcelRequest.findMany({
            where: { status: client_1.OrderStatus.PAID, courierId: null },
            orderBy: { createdAt: 'asc' },
        });
    }
    async acceptOrder(courierId, orderId) {
        const lockKey = `lock:order:${orderId}`;
        const acquired = await this.redis.setLock(lockKey, courierId, 10);
        if (!acquired) {
            throw new common_1.BadRequestException('Order is currently being processed by another courier');
        }
        try {
            const order = await this.prisma.parcelRequest.findUnique({
                where: { id: orderId },
            });
            if (!order)
                throw new common_1.NotFoundException('Order not found');
            if (order.status !== client_1.OrderStatus.PAID)
                throw new common_1.BadRequestException('Order is not available for acceptance');
            if (order.courierId)
                throw new common_1.BadRequestException('Order already accepted');
            const updated = await this.prisma.parcelRequest.update({
                where: { id: orderId },
                data: { courierId, status: client_1.OrderStatus.ACCEPTED },
            });
            await this.prisma.orderStatusHistory.create({
                data: { parcelRequestId: orderId, status: client_1.OrderStatus.ACCEPTED },
            });
            this.trackingGateway.broadcastOrderTaken(orderId);
            return updated;
        }
        finally {
            await this.redis.del(lockKey);
        }
    }
    async updateStatus(orderId, userId, status, photos) {
        const order = await this.prisma.parcelRequest.findUnique({
            where: { id: orderId },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const data = { status };
        if (photos?.pickupPhotoUrl)
            data.pickupPhotoUrl = photos.pickupPhotoUrl;
        if (photos?.deliveryPhotoUrl)
            data.deliveryPhotoUrl = photos.deliveryPhotoUrl;
        const updatedOrder = await this.prisma.parcelRequest.update({
            where: { id: orderId },
            data,
        });
        await this.prisma.orderStatusHistory.create({
            data: { parcelRequestId: orderId, status },
        });
        return updatedOrder;
    }
    async findOne(orderId) {
        return this.prisma.parcelRequest.findUnique({
            where: { id: orderId },
            include: {
                customer: true,
                courier: {
                    include: {
                        courierProfile: true,
                    },
                },
                statusHistory: { orderBy: { createdAt: 'asc' } },
                reviews: true,
                transactions: true,
            },
        });
    }
    async update(orderId, userId, updateDto) {
        return this.prisma.parcelRequest.update({
            where: { id: orderId },
            data: updateDto,
        });
    }
    async remove(orderId, userId) {
        return this.prisma.parcelRequest.delete({ where: { id: orderId } });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        tracking_gateway_1.TrackingGateway])
], OrdersService);
//# sourceMappingURL=orders.service.js.map