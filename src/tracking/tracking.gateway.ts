import {
    ConnectedSocket,
    MessageBody,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

// Utility for calculating distance between two coordinates in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const p = 0.017453292519943295;    // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;

  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TrackingGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async handleDisconnect(client: Socket) {
    const courierId = client.data?.courierId;
    if (courierId) {
      // Mark courier offline
      await this.prisma.courierProfile.updateMany({
        where: { userId: courierId },
        data: { isOnline: false },
      });
      // Expire their location in Redis quickly (60s)
      await this.redis.expire(`courier:${courierId}:location`, 60);
    }
  }

  @SubscribeMessage('parcel:join')
  handleJoinOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`parcel:${orderId}`);
    return { status: 'joined', room: `parcel:${orderId}` };
  }

  @SubscribeMessage('driver:location')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      orderId: string;
      courierId: string;
      lat: number;
      lng: number;
      bearing?: number;
    },
  ) {
    if (!data.courierId) return;

    // Save identifying info on the socket for disconnect handling
    client.data.courierId = data.courierId;

    const key = `courier:${data.courierId}:location`;
    const now = Date.now();

    // 1. Throttle / Validate
    const lastLocationData = await this.redis.hgetall(key);
    if (lastLocationData && lastLocationData.updatedAt) {
      const lastUpdate = Number(lastLocationData.updatedAt);
      
      // Throttle: ignore if updated within last 3 seconds
      if (now - lastUpdate < 3000) {
        return;
      }

      // Validate: ignore if jumped > 1km in 3 seconds (Glitch prevention)
      const lastLat = Number(lastLocationData.lat);
      const lastLng = Number(lastLocationData.lng);
      if (!isNaN(lastLat) && !isNaN(lastLng)) {
        const distanceKm = calculateDistance(lastLat, lastLng, data.lat, data.lng);
        // Rough heuristic: > 1km jump in a few seconds is impossible for a courier
        if (distanceKm > 1 && (now - lastUpdate) < 10000) {
           return; 
        }
      }
    }

    // 2. Save latest location in Redis
    const updateData: any = {
      lat: data.lat,
      lng: data.lng,
      bearing: data.bearing || 0,
      updatedAt: now,
    };

    // Store the actual CourierProfile.id for historical persistence
    if (!lastLocationData || !lastLocationData.profileId) {
      const profile = await this.prisma.courierProfile.findUnique({
        where: { userId: data.courierId },
        select: { id: true },
      });
      if (profile) {
        updateData.profileId = profile.id;
      }
    }

    await this.redis.hset(key, updateData);

    // 4. Update the geo-index for online couriers
    // This allows us to find them quickly by location
    await this.redis.geoadd('couriers:locations', data.lng, data.lat, data.courierId);

    // 5. Emit to parcel room if courier is assigned to an active order
    if (data.orderId) {
      this.server.to(`parcel:${data.orderId}`).emit('courier:location', {
        orderId: data.orderId,
        courierId: data.courierId,
        lat: data.lat,
        lng: data.lng,
        bearing: data.bearing,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('parcel:leave')
  handleLeaveOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`parcel:${orderId}`);
    return { status: 'left', room: `parcel:${orderId}` };
  }

  // Method to find couriers within a radius of a point
  async findNearbyCouriers(lat: number, lng: number, radiusKm: number = 5): Promise<string[]> {
    return await this.redis.geosearch('couriers:locations', lng, lat, radiusKm, 'km');
  }

  // Method to be called from services
  broadcastStatusUpdate(orderId: string, status: string) {
    this.server.to(`parcel:${orderId}`).emit('statusUpdated', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to notify specific couriers about a new order
  notifyCouriersOfNewOrder(courierIds: string[], orderData: any) {
    courierIds.forEach(id => {
      // We assume each courier has their own room named after their userId
      this.server.to(`courier:${id}`).emit('new_order_available', orderData);
    });
  }

  // Method to notify that an order is no longer available
  broadcastOrderTaken(orderId: string) {
    this.server.emit('order_taken', { orderId });
  }

  @SubscribeMessage('courier:online')
  handleCourierOnline(
    @ConnectedSocket() client: Socket,
    @MessageBody() courierId: string,
  ) {
    if (!courierId) return;
    client.join(`courier:${courierId}`);
    return { status: 'listening', room: `courier:${courierId}` };
  }

  @SubscribeMessage('user:join')
  handleUserJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() userId: string,
  ) {
    if (!userId) return;
    client.join(`user:${userId}`);
    return { status: 'joined', room: `user:${userId}` };
  }
}
