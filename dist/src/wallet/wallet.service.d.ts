import { PrismaService } from '../prisma/prisma.service';
export declare class WalletService {
    private prisma;
    constructor(prisma: PrismaService);
    getBalance(userId: string): Promise<{
        balance: number;
        currency: string;
        transactions: {
            id: string;
            type: import("@prisma/client").$Enums.TransactionType;
            amount: number;
            balanceAfter: number;
            date: Date;
            reference: string | undefined;
            status: string;
        }[];
    }>;
    getTransactions(userId: string): Promise<{
        id: string;
        type: import("@prisma/client").$Enums.TransactionType;
        amount: number;
        balanceAfter: number;
        date: Date;
        reference: string | undefined;
        status: string;
    }[]>;
    requestWithdrawal(userId: string, amount: number): Promise<{
        success: boolean;
        message: string;
        amount: number;
    }>;
}
