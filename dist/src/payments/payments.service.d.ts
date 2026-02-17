import { PrismaService } from '../prisma/prisma.service';
export declare class PaymentsService {
    private prisma;
    constructor(prisma: PrismaService);
    private readonly darajaConfig;
    initiateStkPush(orderId: string, phoneNumber: string, amount: number): Promise<{
        message: string;
        transactionId: string;
        checkoutRequestId: string;
    }>;
    simulatePaymentConfirmation(orderId: string, transactionId: string): Promise<void>;
    handleMpesaCallback(payload: any): Promise<void>;
    withdrawToMpesa(courierId: string, amount: number): Promise<{
        message: string;
        transactionId: string;
    }>;
}
