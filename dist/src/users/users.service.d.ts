import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    getStats(userId: string): Promise<{
        totalJobs: number;
        totalEarned: number;
        averageRating: number;
        activeJobs: number;
        totalOrders?: undefined;
        totalSpent?: undefined;
        activeOrders?: undefined;
    } | {
        totalOrders: number;
        totalSpent: number;
        activeOrders: number;
        totalJobs?: undefined;
        totalEarned?: undefined;
        averageRating?: undefined;
        activeJobs?: undefined;
    }>;
    getAddresses(userId: string): Promise<{
        id: string;
        userId: string;
        label: string;
        address: string;
        lat: number | null;
        lng: number | null;
        createdAt: Date;
    }[]>;
    addAddress(userId: string, data: {
        label: string;
        address: string;
        lat?: number;
        lng?: number;
    }): Promise<{
        id: string;
        userId: string;
        label: string;
        address: string;
        lat: number | null;
        lng: number | null;
        createdAt: Date;
    }>;
    deleteAddress(userId: string, addressId: string): Promise<{
        success: boolean;
    }>;
}
