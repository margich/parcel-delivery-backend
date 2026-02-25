import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    getStats(userId: string): Promise<{
        totalJobs: number;
        totalEarned: number | import("@prisma/client-runtime-utils").Decimal;
        averageRating: number;
        activeJobs: number;
        ratingCount: number;
        ratingSum: number;
        totalOrders?: undefined;
        totalSpent?: undefined;
        activeOrders?: undefined;
    } | {
        totalOrders: number;
        totalSpent: number | import("@prisma/client-runtime-utils").Decimal;
        activeOrders: number;
        totalJobs?: undefined;
        totalEarned?: undefined;
        averageRating?: undefined;
        activeJobs?: undefined;
        ratingCount?: undefined;
        ratingSum?: undefined;
    }>;
    getAddresses(userId: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        label: string;
        address: string;
        lat: number | null;
        lng: number | null;
    }[]>;
    addAddress(userId: string, data: {
        label: string;
        address: string;
        lat?: number;
        lng?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        label: string;
        address: string;
        lat: number | null;
        lng: number | null;
    }>;
    deleteAddress(userId: string, addressId: string): Promise<{
        success: boolean;
    }>;
}
