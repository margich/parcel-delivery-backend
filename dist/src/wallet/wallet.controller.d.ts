import { WalletService } from './wallet.service';
export declare class WalletController {
    private walletService;
    constructor(walletService: WalletService);
    getBalance(req: any): Promise<{
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
    getTransactions(req: any): Promise<{
        id: string;
        type: import("@prisma/client").$Enums.TransactionType;
        amount: number;
        balanceAfter: number;
        date: Date;
        reference: string | undefined;
        status: string;
    }[]>;
    withdraw(req: any, data: {
        amount: number;
    }): Promise<{
        success: boolean;
        message: string;
        amount: number;
    }>;
}
