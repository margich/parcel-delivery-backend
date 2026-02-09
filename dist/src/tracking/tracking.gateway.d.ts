import { Server, Socket } from 'socket.io';
export declare class TrackingGateway {
    server: Server;
    handleJoinOrder(orderId: string, client: Socket): {
        status: string;
        room: string;
    };
    handleLocationUpdate(data: {
        orderId: string;
        lat: number;
        lng: number;
        bearing?: number;
    }): void;
    handleLeaveOrder(orderId: string, client: Socket): {
        status: string;
        room: string;
    };
    broadcastStatusUpdate(orderId: string, status: string): void;
}
