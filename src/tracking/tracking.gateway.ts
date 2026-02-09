import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TrackingGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinOrder')
  handleJoinOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`order_${orderId}`);
    return { status: 'joined', room: `order_${orderId}` };
  }

  @SubscribeMessage('updateLocation')
  handleLocationUpdate(
    @MessageBody() data: { orderId: string; lat: number; lng: number; bearing?: number },
  ) {
    this.server.to(`order_${data.orderId}`).emit('locationUpdated', {
      lat: data.lat,
      lng: data.lng,
      bearing: data.bearing,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('leaveOrder')
  handleLeaveOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`order_${orderId}`);
    return { status: 'left', room: `order_${orderId}` };
  }

  // Method to be called from services
  broadcastStatusUpdate(orderId: string, status: string) {
    this.server.to(`order_${orderId}`).emit('statusUpdated', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}
