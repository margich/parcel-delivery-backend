import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(data: any) {
    const { phoneNumber, name, role, password, ...courierData } = data;

    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        phoneNumber,
        name,
        password: hashedPassword,
        role,
        defaultRole: role,
      },
    });

    if (role === 'COURIER') {
      await this.prisma.courierProfile.create({
        data: {
          userId: user.id,
          vehicleType: courierData.vehicleType,
          vehiclePhotoUrl: courierData.vehiclePhotoUrl,
          plateNumber: courierData.plateNumber,
          idCardPhotoUrl: courierData.idCardPhotoUrl,
        },
      });
    }

    return this.login(user); // Auto-login after registration
  }

  async validateUser(phoneNumber: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { phoneNumber } });
    // Note: I need to add 'password' to my Prisma schema. I'll do that now.
    if (user && await bcrypt.compare(pass, (user as any).password)) {
      const { password, ...result } = user as any;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { sub: user.id, phoneNumber: user.phoneNumber, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        defaultRole: user.defaultRole,
      },
    };
  }
}
