import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(registerDto: any): Promise<{
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
    login(req: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            phoneNumber: any;
            mpesaNumber: any;
            role: any;
            defaultRole: any;
        };
    } | {
        message: string;
    }>;
    getProfile(req: any): Promise<({
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
    updateProfile(req: any, updateDto: any): Promise<{
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
