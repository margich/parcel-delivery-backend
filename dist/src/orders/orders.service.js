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
const tracking_gateway_1 = require("../tracking/tracking.gateway");
let OrdersService = class OrdersService {
    prisma;
    trackingGateway;
    constructor(prisma, trackingGateway) {
        this.prisma = prisma;
        this.trackingGateway = trackingGateway;
    }
    pricing = {
        [client_1.VehicleType.HANDCART]: 200,
        [client_1.VehicleType.BIKE]: 350,
        [client_1.VehicleType.CAR]: 800,
    };
    getPricing() {
        return this.pricing;
    }
    async create(customerId, data) {
        const price = this.pricing[data.vehicleType];
        if (!price)
            throw new common_1.BadRequestException('Invalid vehicle type');
        return this.prisma.parcelRequest.create({
            data: {
                customerId,
                pickupAddress: data.pickupAddress,
                pickupLat: data.pickupLat,
                pickupLng: data.pickupLng,
                dropoffAddress: data.dropoffAddress,
                dropoffLat: data.dropoffLat,
                dropoffLng: data.dropoffLng,
                vehicleType: data.vehicleType,
                packageType: data.packageType,
                instructions: data.instructions,
                price,
                status: client_1.OrderStatus.CREATED,
            },
        });
    }
    async getAvailableOrders(courierId) {
        const courier = await this.prisma.courierProfile.findUnique({
            where: { userId: courierId },
        });
        if (!courier || courier.verificationStatus !== 'VERIFIED') {
            throw new common_1.ForbiddenException('Only verified couriers can see jobs');
        }
        return this.prisma.parcelRequest.findMany({
            where: {
                status: client_1.OrderStatus.PAID,
                vehicleType: courier.vehicleType,
            },
            include: { customer: true },
        });
    }
    async acceptOrder(courierId, orderId) {
        const order = await this.prisma.parcelRequest.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.status !== client_1.OrderStatus.PAID)
            throw new common_1.BadRequestException('Order is not available for acceptance');
        const updatedOrder = await this.prisma.parcelRequest.update({
            where: { id: orderId },
            data: {
                courierId,
                status: client_1.OrderStatus.ACCEPTED,
            },
        });
        this.trackingGateway.broadcastStatusUpdate(orderId, client_1.OrderStatus.ACCEPTED);
        return updatedOrder;
    }
    async updateStatus(orderId, userId, status, photos) {
        const order = await this.prisma.parcelRequest.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.customerId !== userId && order.courierId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to update this order');
        }
        const updatedOrder = await this.prisma.parcelRequest.update({
            where: { id: orderId },
            data: {
                status,
                ...(photos?.pickupPhotoUrl && { pickupPhotoUrl: photos.pickupPhotoUrl }),
                ...(photos?.deliveryPhotoUrl && { deliveryPhotoUrl: photos.deliveryPhotoUrl }),
            },
        });
        this.trackingGateway.broadcastStatusUpdate(orderId, status);
        return updatedOrder;
    }
    async findOne(id) {
        const order = await this.prisma.parcelRequest.findUnique({
            where: { id },
            include: {
                customer: { select: { id: true, name: true, phoneNumber: true, overallRating: true } },
                courier: { select: { id: true, name: true, phoneNumber: true, overallRating: true } },
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const result = { ...order };
        if (order.status === client_1.OrderStatus.CREATED || order.status === client_1.OrderStatus.PAID) {
            if (result.customer)
                result.customer.phoneNumber = 'Hidden';
            if (result.courier)
                result.courier.phoneNumber = 'Hidden';
        }
        return result;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tracking_gateway_1.TrackingGateway])
], OrdersService);
//# sourceMappingURL=orders.service.js.map