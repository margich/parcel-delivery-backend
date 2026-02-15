import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    getStats(userId: string): Promise<{
        totalOrders: number;
        totalSpent: number;
        activeOrders: number;
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
