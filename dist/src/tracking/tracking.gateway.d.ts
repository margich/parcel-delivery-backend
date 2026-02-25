import { OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
export declare class TrackingGateway implements OnGatewayDisconnect {
    private prisma;
    private redis;
    server: Server;
    constructor(prisma: PrismaService, redis: RedisService);
    handleDisconnect(client: Socket): Promise<void>;
    handleJoinOrder(orderId: string, client: Socket): {
        status: string;
        room: string;
    };
    handleLocationUpdate(client: Socket, data: {
        orderId: string;
        courierId: string;
        lat: number;
        lng: number;
        bearing?: number;
    }): Promise<void>;
    handleLeaveOrder(orderId: string, client: Socket): {
        status: string;
        room: string;
    };
    findNearbyCouriers(lat: number, lng: number, radiusKm?: number): Promise<string[]>;
    broadcastStatusUpdate(orderId: string, status: string): void;
    notifyCouriersOfNewOrder(courierIds: string[], orderData: any): void;
    broadcastOrderTaken(orderId: string): void;
    handleCourierOnline(client: Socket, courierId: string): {
        status: string;
        room: string;
    } | undefined;
    handleUserJoin(client: Socket, userId: string): {
        status: string;
        room: string;
    } | undefined;
}
