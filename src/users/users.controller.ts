import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('stats')
  async getStats(@Request() req: any) {
    return this.usersService.getStats(req.user.id);
  }

  @Get('addresses')
  async getAddresses(@Request() req: any) {
    return this.usersService.getAddresses(req.user.id);
  }

  @Post('addresses')
  async addAddress(@Request() req: any, @Body() data: { label: string; address: string; lat?: number; lng?: number }) {
    return this.usersService.addAddress(req.user.id, data);
  }

  @Delete('addresses/:id')
  async deleteAddress(@Request() req: any, @Param('id') id: string) {
    return this.usersService.deleteAddress(req.user.id, id);
  }
}
