import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getStats(req: any): Promise<{
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
    getAddresses(req: any): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        label: string;
        address: string;
        lat: number | null;
        lng: number | null;
    }[]>;
    addAddress(req: any, data: {
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
    deleteAddress(req: any, id: string): Promise<{
        success: boolean;
    }>;
}
