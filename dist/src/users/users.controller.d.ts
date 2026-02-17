import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getStats(req: any): Promise<{
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
    getAddresses(req: any): Promise<{
        id: string;
        userId: string;
        label: string;
        address: string;
        lat: number | null;
        lng: number | null;
        createdAt: Date;
    }[]>;
    addAddress(req: any, data: {
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
    deleteAddress(req: any, id: string): Promise<{
        success: boolean;
    }>;
}
