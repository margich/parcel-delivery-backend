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
                customer: { connect: { id: customerId } },
                pickupAddress: data.pickupAddress,
                pickupLat: parseFloat(data.pickupLat) || -1.2921,
                pickupLng: parseFloat(data.pickupLng) || 36.8219,
                dropoffAddress: data.dropoffAddress,
                dropoffLat: parseFloat(data.dropoffLat) || -1.2921,
                dropoffLng: parseFloat(data.dropoffLng) || 36.8219,
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
        if (!courier) {
            throw new common_1.ForbiddenException('Only registered couriers can see jobs');
        }
        if (courier.verificationStatus === 'REJECTED') {
            throw new common_1.ForbiddenException('Your courier profile has been rejected. Please contact support.');
        }
        return this.prisma.parcelRequest.findMany({
            where: {
                status: client_1.OrderStatus.PAID,
                vehicleType: courier.vehicleType,
            },
            include: { customer: true },
        });
    }
    async getMyOrders(userId) {
        return this.prisma.parcelRequest.findMany({
            where: {
                OR: [
                    { customerId: userId },
                    { courierId: userId }
                ]
            },
            include: {
                customer: { select: { name: true, phoneNumber: true } },
                courier: {
                    select: {
                        name: true,
                        phoneNumber: true,
                        courierProfile: {
                            select: {
                                vehicleType: true,
                                latitude: true,
                                longitude: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
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
                courier: {
                    select: {
                        id: true,
                        name: true,
                        phoneNumber: true,
                        overallRating: true,
                        courierProfile: {
                            select: {
                                vehicleType: true,
                                plateNumber: true,
                                latitude: true,
                                longitude: true
                            }
                        }
                    }
                },
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
    async update(orderId, userId, data) {
        const order = await this.prisma.parcelRequest.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.customerId !== userId)
            throw new common_1.ForbiddenException('Not your order');
        if (order.status !== client_1.OrderStatus.CREATED) {
            throw new common_1.BadRequestException('Cannot edit an order once it has been paid. Only CREATED orders can be edited.');
        }
        let price = order.price;
        if (data.vehicleType && data.vehicleType !== order.vehicleType) {
            price = this.pricing[data.vehicleType];
            if (!price)
                throw new common_1.BadRequestException('Invalid vehicle type');
        }
        return this.prisma.parcelRequest.update({
            where: { id: orderId },
            data: {
                pickupAddress: data.pickupAddress ?? order.pickupAddress,
                pickupLat: data.pickupLat ?? order.pickupLat,
                pickupLng: data.pickupLng ?? order.pickupLng,
                dropoffAddress: data.dropoffAddress ?? order.dropoffAddress,
                dropoffLat: data.dropoffLat ?? order.dropoffLat,
                dropoffLng: data.dropoffLng ?? order.dropoffLng,
                vehicleType: data.vehicleType ?? order.vehicleType,
                packageType: data.packageType ?? order.packageType,
                instructions: data.instructions ?? order.instructions,
                price,
            },
        });
    }
    async remove(orderId, userId) {
        const order = await this.prisma.parcelRequest.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.customerId !== userId)
            throw new common_1.ForbiddenException('Not your order');
        if (order.status !== client_1.OrderStatus.CREATED) {
            throw new common_1.BadRequestException('Only unpaid orders can be deleted. Please contact support for refunds on paid orders.');
        }
        return this.prisma.parcelRequest.delete({
            where: { id: orderId },
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tracking_gateway_1.TrackingGateway])
], OrdersService);
//# sourceMappingURL=orders.service.js.map