import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(data: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            phoneNumber: any;
            mpesaNumber: any;
            role: any;
            defaultRole: any;
        };
    }>;
    validateUser(phoneNumber: string, pass: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            phoneNumber: any;
            mpesaNumber: any;
            role: any;
            defaultRole: any;
        };
    }>;
    getUserById(userId: string): Promise<({
        courierProfile: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            vehicleType: import("@prisma/client").$Enums.VehicleType;
            vehiclePhotoUrl: string | null;
            plateNumber: string | null;
            idCardFrontPhotoUrl: string | null;
            idCardBackPhotoUrl: string | null;
            payoutMpesaNumber: string | null;
            isOnline: boolean;
            latitude: number | null;
            longitude: number | null;
            walletBalance: number;
            verificationStatus: import("@prisma/client").$Enums.VerificationStatus;
        } | null;
    } & {
        id: string;
        phoneNumber: string;
        password: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        activeRole: import("@prisma/client").$Enums.Role;
        defaultRole: import("@prisma/client").$Enums.Role;
        mpesaNumber: string | null;
        overallRating: number;
        lastLogin: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    updateProfile(userId: string, data: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            phoneNumber: any;
            mpesaNumber: any;
            role: any;
            defaultRole: any;
        };
    }>;
}
