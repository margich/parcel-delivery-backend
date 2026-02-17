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
  constructor(private ordersService: OrdersService) {}

  @Get('pricing')
  getPricing() {
    return this.ordersService.getPricing();
  }

  @Get()
  async getMyOrders(@Request() req: any) {
    return this.ordersService.getMyOrders(req.user.id);
  }

  @Post()
  async create(@Request() req: any, @Body() orderDto: any) {
    return this.ordersService.create(req.user.id, orderDto);
  }

  @Get('available')
  async getAvailable(@Request() req: any) {
    return this.ordersService.getAvailableOrders(req.user.id);
  }

  @Patch(':id/accept')
  async accept(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.acceptOrder(req.user.id, id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('photos') photos?: any,
  ) {
    return this.ordersService.updateStatus(id, req.user.id, status, photos);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: any,
  ) {
    return this.ordersService.update(id, req.user.id, updateDto);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.ordersService.remove(id, req.user.id);
  }
}
