import { WalletService } from './wallet.service';
export declare class WalletController {
    private walletService;
    constructor(walletService: WalletService);
    getBalance(req: any): Promise<{
        balance: number;
        currency: string;
    }>;
    getTransactions(req: any): Promise<{
        id: string;
        type: string;
        amount: number;
        date: Date;
        reference: string;
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
