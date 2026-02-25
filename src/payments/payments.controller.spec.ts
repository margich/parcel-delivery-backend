import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('pricing')
  getPricing() {
    return this.ordersService.getPricing();
  }

  @Get()
  getMyOrders(@Request() req: any) {
    return this.ordersService.getMyOrders(req.user.id);
  }

  @Post()
  create(@Request() req: any, @Body() orderDto: any) {
    return this.ordersService.create(req.user.id, orderDto);
  }

  @Get('available')
  getAvailableOrders(@Request() req: any) {
    return this.ordersService.getAvailableOrders(req.user.id);
  }

  @Patch(':id/accept')
  acceptOrder(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.acceptOrder(req.user.id, id);
  }

  @Patch(':id/status')
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('photos') photos?: any,
  ) {
    return this.ordersService.updateStatus(id, req.user.id, status, photos);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() updateDto: any) {
    return this.ordersService.update(id, req.user.id, updateDto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.remove(id, req.user.id);
  }
}
