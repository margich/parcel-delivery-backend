import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getStats(req: any): Promise<{
        totalOrders: number;
        totalSpent: number;
        activeOrders: number;
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
