import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('stk-push')
  async initiateStk(@Request() req: any, @Body() body: { orderId: string; phoneNumber: string; amount: number }) {
    return this.paymentsService.initiateStkPush(body.orderId, body.phoneNumber, body.amount);
  }

  @Post('callback')
  async mpesaCallback(@Body() body: any) {
    return this.paymentsService.handleMpesaCallback(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('withdraw')
  async withdraw(@Request() req: any, @Body() body: { amount: number }) {
    return this.paymentsService.withdrawToMpesa(req.user.id, body.amount);
  }
}
