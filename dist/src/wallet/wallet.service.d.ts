import { PrismaService } from '../prisma/prisma.service';
export declare class WalletService {
    private prisma;
    constructor(prisma: PrismaService);
    getBalance(userId: string): Promise<{
        balance: number;
        currency: string;
    }>;
    getTransactions(userId: string): Promise<{
        id: any;
        type: string;
        amount: any;
        date: any;
        reference: string;
        status: string;
    }[]>;
    requestWithdrawal(userId: string, amount: number): Promise<{
        success: boolean;
        message: string;
        amount: number;
    }>;
}
