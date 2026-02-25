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
            courierProfile: any;
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
            courierProfile: any;
        };
    } | {
        message: string;
    }>;
    getProfile(req: any): Promise<({
        courierProfile: {
            id: string;
            ratingCount: number;
            ratingSum: number;
            overallRating: import("@prisma/client-runtime-utils").Decimal;
            createdAt: Date;
            updatedAt: Date;
            isDeleted: boolean;
            deletedAt: Date | null;
            vehicleType: import("@prisma/client").$Enums.VehicleType;
            userId: string;
            vehiclePhotoUrl: string | null;
            plateNumber: string | null;
            idCardNumber: string | null;
            idCardFrontPhotoUrl: string | null;
            idCardBackPhotoUrl: string | null;
            payoutMpesaNumber: string | null;
            isOnline: boolean;
            verificationStatus: import("@prisma/client").$Enums.VerificationStatus;
        } | null;
    } & {
        name: string;
        id: string;
        phoneNumber: string;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        activeRole: import("@prisma/client").$Enums.Role;
        mpesaNumber: string | null;
        ratingCount: number;
        ratingSum: number;
        overallRating: import("@prisma/client-runtime-utils").Decimal;
        lastLogin: Date | null;
        createdAt: Date;
        updatedAt: Date;
        isDeleted: boolean;
        deletedAt: Date | null;
    }) | null>;
    updateProfile(req: any, updateDto: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            phoneNumber: any;
            mpesaNumber: any;
            role: any;
            courierProfile: any;
        };
    }>;
}
