import { Body, ConflictException, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: any) {
    try {
      return await this.authService.register(registerDto);
    } catch (error) {
       if (error instanceof ConflictException) {
         throw error;
       }
       throw error;
    }
  }

  @Post('login')
  async login(@Request() req: any) {
    // In a full implementation, we'd use a LocalAuthGuard here.
    // For MVP, we'll validate manually or just use the service.
    const user = await this.authService.validateUser(req.body.phoneNumber, req.body.password);
    if (!user) {
      return { message: 'Invalid credentials' }; // Replace with UnauthorizedException
    }
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
