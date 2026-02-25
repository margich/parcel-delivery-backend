import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TrackingGateway } from '../tracking/tracking.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private trackingGateway: TrackingGateway,
  ) {}

  async getPricing() {
    return { baseFare: 100, perKm: 20 };
  }

  async getMyOrders(userId: string) {
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

  async create(userId: string, orderDto: any) {
    const {
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
    } = orderDto;

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
        status: OrderStatus.CREATED,
      },
    });
  }

  async getAvailableOrders(userId: string) {
    return this.prisma.parcelRequest.findMany({
      where: { status: OrderStatus.PAID, courierId: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async acceptOrder(courierId: string, orderId: string) {
    const lockKey = `lock:order:${orderId}`;
    const acquired = await this.redis.setLock(lockKey, courierId, 10); // 10s lock

    if (!acquired) {
      throw new BadRequestException('Order is currently being processed by another courier');
    }

    try {
      const order = await this.prisma.parcelRequest.findUnique({
        where: { id: orderId },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.PAID)
        throw new BadRequestException('Order is not available for acceptance');
      if (order.courierId)
        throw new BadRequestException('Order already accepted');

      const updated = await this.prisma.parcelRequest.update({
        where: { id: orderId },
        data: { courierId, status: OrderStatus.ACCEPTED },
      });

      await this.prisma.orderStatusHistory.create({
        data: { parcelRequestId: orderId, status: OrderStatus.ACCEPTED },
      });

      // Broadcast to others that order is taken
      this.trackingGateway.broadcastOrderTaken(orderId);

      return updated;
    } finally {
      // Optional: don't delete lock immediately to prevent hammering if DB update was slow, 
      // but usually we should cleanup if successful. 
      // For now we rely on TTL or delete it.
      await this.redis.del(lockKey);
    }
  }

  async updateStatus(
    orderId: string,
    userId: string,
    status: OrderStatus,
    photos?: any,
  ) {
    const order = await this.prisma.parcelRequest.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const data: any = { status };
    if (photos?.pickupPhotoUrl) data.pickupPhotoUrl = photos.pickupPhotoUrl;
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

  async findOne(orderId: string) {
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

  async update(orderId: string, userId: string, updateDto: any) {
    return this.prisma.parcelRequest.update({
      where: { id: orderId },
      data: updateDto,
    });
  }

  async remove(orderId: string, userId: string) {
    return this.prisma.parcelRequest.delete({ where: { id: orderId } });
  }
}
