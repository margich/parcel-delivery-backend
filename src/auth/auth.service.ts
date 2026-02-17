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
        activeRole: role,
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
          idCardFrontPhotoUrl: courierData.idCardFrontPhotoUrl,
          idCardBackPhotoUrl: courierData.idCardBackPhotoUrl,
          payoutMpesaNumber: courierData.payoutMpesaNumber,
        },
      });
    }

    return this.login(user); // Auto-login after registration
  }

  async validateUser(phoneNumber: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { phoneNumber } });
    // Note: I need to add 'password' to my Prisma schema. I'll do that now.
    if (user && (await bcrypt.compare(pass, (user as any).password))) {
      const { password, ...result } = user as any;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: user.activeRole || user.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        mpesaNumber: user.mpesaNumber,
        role: user.activeRole || user.role,
        defaultRole: user.defaultRole,
      },
    };
  }

  async getUserById(userId: string) {
    return await this.prisma.user.findUnique({
      where: { id: userId },
      include: { courierProfile: true },
    });
  }
  async updateProfile(userId: string, data: any) {
    const {
      name,
      vehicleType,
      vehiclePhotoUrl,
      plateNumber,
      idCardFrontPhotoUrl,
      idCardBackPhotoUrl,
      payoutMpesaNumber,
      mpesaNumber,
    } = data;

    const wantsToBecomeCourier = !!(
      vehicleType ||
      vehiclePhotoUrl ||
      plateNumber ||
      idCardFrontPhotoUrl ||
      idCardBackPhotoUrl ||
      payoutMpesaNumber
    );

    // Update User fields
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(mpesaNumber && { mpesaNumber }),
        ...(wantsToBecomeCourier && {
          role: 'COURIER',
          activeRole: 'COURIER',
          defaultRole: 'COURIER',
        }),
      },
      include: { courierProfile: true },
    });

    // Create Courier Profile if user is becoming a courier and doesn't have one yet
    if (
      updatedUser.role === 'COURIER' &&
      wantsToBecomeCourier &&
      !updatedUser.courierProfile
    ) {
      await this.prisma.courierProfile.create({
        data: {
          userId,
          vehicleType: vehicleType || 'BIKE',
          vehiclePhotoUrl,
          plateNumber,
          idCardFrontPhotoUrl,
          idCardBackPhotoUrl,
          payoutMpesaNumber,
        },
      });
    }

    // Update Courier Profile fields if they exist and user is a courier
    if (
      updatedUser.role === 'COURIER' &&
      (vehicleType ||
        plateNumber ||
        vehiclePhotoUrl ||
        idCardFrontPhotoUrl ||
        idCardBackPhotoUrl ||
        payoutMpesaNumber)
    ) {
      await this.prisma.courierProfile.update({
        where: { userId },
        data: {
          ...(vehicleType && { vehicleType }),
          ...(vehiclePhotoUrl && { vehiclePhotoUrl }),
          ...(plateNumber && { plateNumber }),
          ...(idCardFrontPhotoUrl && { idCardFrontPhotoUrl }),
          ...(idCardBackPhotoUrl && { idCardBackPhotoUrl }),
          ...(payoutMpesaNumber && { payoutMpesaNumber }),
        },
      });
    }

    const userForToken = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { courierProfile: true },
    });

    return this.login(userForToken); // Return new token/user obj
  }
}
