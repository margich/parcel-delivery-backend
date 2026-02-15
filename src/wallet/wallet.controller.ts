import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('balance')
  async getBalance(@Request() req: any) {
    return this.walletService.getBalance(req.user.id);
  }

  @Get('transactions')
  async getTransactions(@Request() req: any) {
    return this.walletService.getTransactions(req.user.id);
  }

  @Post('withdraw')
  async withdraw(@Request() req: any, @Body() data: { amount: number }) {
    return this.walletService.requestWithdrawal(req.user.id, data.amount);
  }
}
