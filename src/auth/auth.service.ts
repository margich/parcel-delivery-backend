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
      },
    });

    if (role === 'COURIER') {
      const courierProfile = await this.prisma.courierProfile.create({
        data: {
          userId: user.id,
          vehicleType: courierData.vehicleType,
          vehiclePhotoUrl: courierData.vehiclePhotoUrl,
          plateNumber: courierData.plateNumber,
          idCardNumber: courierData.idCardNumber,
          idCardFrontPhotoUrl: courierData.idCardFrontPhotoUrl,
          idCardBackPhotoUrl: courierData.idCardBackPhotoUrl,
          payoutMpesaNumber: courierData.payoutMpesaNumber,
        },
      });

      // Create wallet for the courier
      await this.prisma.wallet.create({
        data: { courierId: courierProfile.id },
      });
    }

    return this.login(user);
  }

  async validateUser(phoneNumber: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { phoneNumber } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
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
        courierProfile: user.courierProfile,
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
      idCardNumber,
      idCardFrontPhotoUrl,
      idCardBackPhotoUrl,
      payoutMpesaNumber,
      mpesaNumber,
      isOnline,
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
      const courierProfile = await this.prisma.courierProfile.create({
        data: {
          userId,
          vehicleType: vehicleType || 'BIKE',
          vehiclePhotoUrl,
          plateNumber,
          idCardNumber,
          idCardFrontPhotoUrl,
          idCardBackPhotoUrl,
          payoutMpesaNumber,
        },
      });

      // Create wallet for new courier profile
      await this.prisma.wallet.create({
        data: { courierId: courierProfile.id },
      });
    } else if (
      updatedUser.role === 'COURIER' &&
      (vehicleType ||
        plateNumber ||
        vehiclePhotoUrl ||
        idCardNumber ||
        idCardFrontPhotoUrl ||
        idCardBackPhotoUrl ||
        payoutMpesaNumber ||
        typeof isOnline === 'boolean')
    ) {
      // Update existing Courier Profile fields
      await this.prisma.courierProfile.update({
        where: { userId },
        data: {
          ...(vehicleType && { vehicleType }),
          ...(vehiclePhotoUrl && { vehiclePhotoUrl }),
          ...(plateNumber && { plateNumber }),
          ...(idCardNumber && { idCardNumber }),
          ...(idCardFrontPhotoUrl && { idCardFrontPhotoUrl }),
          ...(idCardBackPhotoUrl && { idCardBackPhotoUrl }),
          ...(payoutMpesaNumber && { payoutMpesaNumber }),
          ...(typeof isOnline === 'boolean' && { isOnline }),
        },
      });
    }

    const userForToken = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { courierProfile: true },
    });

    return this.login(userForToken);
  }
}
