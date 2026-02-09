import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, VehicleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingGateway } from '../tracking/tracking.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private trackingGateway: TrackingGateway,
  ) {}

  private readonly pricing = {
    [VehicleType.HANDCART]: 200,
    [VehicleType.BIKE]: 350,
    [VehicleType.CAR]: 800,
  };

  getPricing() {
    return this.pricing;
  }

  async create(customerId: string, data: any) {
    const price = this.pricing[data.vehicleType as VehicleType];
    if (!price) throw new BadRequestException('Invalid vehicle type');

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
        status: OrderStatus.CREATED,
      },
    });
  }

  async getAvailableOrders(courierId: string) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId: courierId },
    });

    if (!courier || courier.verificationStatus !== 'VERIFIED') {
      throw new ForbiddenException('Only verified couriers can see jobs');
    }

    return this.prisma.parcelRequest.findMany({
      where: {
        status: OrderStatus.PAID,
        vehicleType: courier.vehicleType,
      },
      include: { customer: true },
    });
  }

  async acceptOrder(courierId: string, orderId: string) {
    const order = await this.prisma.parcelRequest.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PAID) throw new BadRequestException('Order is not available for acceptance');

    const updatedOrder = await this.prisma.parcelRequest.update({
      where: { id: orderId },
      data: {
        courierId,
        status: OrderStatus.ACCEPTED,
      },
    });

    this.trackingGateway.broadcastStatusUpdate(orderId, OrderStatus.ACCEPTED);
    return updatedOrder;
  }

  async updateStatus(orderId: string, userId: string, status: OrderStatus, photos?: any) {
    const order = await this.prisma.parcelRequest.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.customerId !== userId && order.courierId !== userId) {
      throw new ForbiddenException('You do not have permission to update this order');
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
    
    // Logic for payment release on DELIVERED could go here or in PaymentsService
    return updatedOrder;
  }

  async findOne(id: string) {
    const order = await this.prisma.parcelRequest.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phoneNumber: true, overallRating: true } },
        courier: { select: { id: true, name: true, phoneNumber: true, overallRating: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Phone number visibility logic: only show if ACCEPTED or higher
    const result = { ...order };
    if (order.status === OrderStatus.CREATED || order.status === OrderStatus.PAID) {
      if (result.customer) (result.customer as any).phoneNumber = 'Hidden';
      if (result.courier) (result.courier as any).phoneNumber = 'Hidden';
    }
    
    return result;
  }
}
