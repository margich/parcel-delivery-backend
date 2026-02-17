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
        status: OrderStatus.CREATED,
      },
    });
  }

  async getAvailableOrders(courierId: string) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { userId: courierId },
    });

    if (!courier) {
      throw new ForbiddenException('Only registered couriers can see jobs');
    }

    if (courier.verificationStatus === 'REJECTED') {
      throw new ForbiddenException('Your courier profile has been rejected. Please contact support.');
    }

    return this.prisma.parcelRequest.findMany({
      where: {
        status: OrderStatus.PAID,
        vehicleType: courier.vehicleType,
      },
      include: { customer: true },
    });
  }

  async getMyOrders(userId: string) {
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
    if (!order) throw new NotFoundException('Order not found');

    // Phone number visibility logic: only show if ACCEPTED or higher
    const result = { ...order };
    if (order.status === OrderStatus.CREATED || order.status === OrderStatus.PAID) {
      if (result.customer) (result.customer as any).phoneNumber = 'Hidden';
      if (result.courier) (result.courier as any).phoneNumber = 'Hidden';
    }
    
    return result;
  }

  async update(orderId: string, userId: string, data: any) {
    const order = await this.prisma.parcelRequest.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== userId) throw new ForbiddenException('Not your order');
    
    // Only allow editing if not paid or accepted yet
    if (order.status !== OrderStatus.CREATED) {
      throw new BadRequestException('Cannot edit an order once it has been paid. Only CREATED orders can be edited.');
    }

    // Recalculate price if vehicle type changes
    let price = order.price;
    if (data.vehicleType && data.vehicleType !== order.vehicleType) {
      price = this.pricing[data.vehicleType as VehicleType];
      if (!price) throw new BadRequestException('Invalid vehicle type');
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

  async remove(orderId: string, userId: string) {
    const order = await this.prisma.parcelRequest.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== userId) throw new ForbiddenException('Not your order');

    // Deletion restricted to CREATED (unpaid) orders as per user request
    if (order.status !== OrderStatus.CREATED) {
      throw new BadRequestException('Only unpaid orders can be deleted. Please contact support for refunds on paid orders.');
    }

    return this.prisma.parcelRequest.delete({
      where: { id: orderId },
    });
  }
}
