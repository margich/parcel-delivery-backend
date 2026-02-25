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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
function calculateDistance(lat1, lon1, lat2, lon2) {
    const p = 0.017453292519943295;
    const c = Math.cos;
    const a = 0.5 - c((lat2 - lat1) * p) / 2 +
        c(lat1 * p) * c(lat2 * p) *
            (1 - c((lon2 - lon1) * p)) / 2;
    return 12742 * Math.asin(Math.sqrt(a));
}
let TrackingGateway = class TrackingGateway {
    prisma;
    redis;
    server;
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async handleDisconnect(client) {
        const courierId = client.data?.courierId;
        if (courierId) {
            await this.prisma.courierProfile.updateMany({
                where: { userId: courierId },
                data: { isOnline: false },
            });
            await this.redis.expire(`courier:${courierId}:location`, 60);
        }
    }
    handleJoinOrder(orderId, client) {
        client.join(`parcel:${orderId}`);
        return { status: 'joined', room: `parcel:${orderId}` };
    }
    async handleLocationUpdate(client, data) {
        if (!data.courierId)
            return;
        client.data.courierId = data.courierId;
        const key = `courier:${data.courierId}:location`;
        const now = Date.now();
        const lastLocationData = await this.redis.hgetall(key);
        if (lastLocationData && lastLocationData.updatedAt) {
            const lastUpdate = Number(lastLocationData.updatedAt);
            if (now - lastUpdate < 3000) {
                return;
            }
            const lastLat = Number(lastLocationData.lat);
            const lastLng = Number(lastLocationData.lng);
            if (!isNaN(lastLat) && !isNaN(lastLng)) {
                const distanceKm = calculateDistance(lastLat, lastLng, data.lat, data.lng);
                if (distanceKm > 1 && (now - lastUpdate) < 10000) {
                    return;
                }
            }
        }
        const updateData = {
            lat: data.lat,
            lng: data.lng,
            bearing: data.bearing || 0,
            updatedAt: now,
        };
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
        await this.redis.geoadd('couriers:locations', data.lng, data.lat, data.courierId);
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
    handleLeaveOrder(orderId, client) {
        client.leave(`parcel:${orderId}`);
        return { status: 'left', room: `parcel:${orderId}` };
    }
    async findNearbyCouriers(lat, lng, radiusKm = 5) {
        return await this.redis.geosearch('couriers:locations', lng, lat, radiusKm, 'km');
    }
    broadcastStatusUpdate(orderId, status) {
        this.server.to(`parcel:${orderId}`).emit('statusUpdated', {
            orderId,
            status,
            timestamp: new Date().toISOString(),
        });
    }
    notifyCouriersOfNewOrder(courierIds, orderData) {
        courierIds.forEach(id => {
            this.server.to(`courier:${id}`).emit('new_order_available', orderData);
        });
    }
    broadcastOrderTaken(orderId) {
        this.server.emit('order_taken', { orderId });
    }
    handleCourierOnline(client, courierId) {
        if (!courierId)
            return;
        client.join(`courier:${courierId}`);
        return { status: 'listening', room: `courier:${courierId}` };
    }
    handleUserJoin(client, userId) {
        if (!userId)
            return;
        client.join(`user:${userId}`);
        return { status: 'joined', room: `user:${userId}` };
    }
};
exports.TrackingGateway = TrackingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], TrackingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('parcel:join'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], TrackingGateway.prototype, "handleJoinOrder", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('driver:location'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], TrackingGateway.prototype, "handleLocationUpdate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('parcel:leave'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], TrackingGateway.prototype, "handleLeaveOrder", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('courier:online'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], TrackingGateway.prototype, "handleCourierOnline", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('user:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], TrackingGateway.prototype, "handleUserJoin", null);
exports.TrackingGateway = TrackingGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], TrackingGateway);
//# sourceMappingURL=tracking.gateway.js.map