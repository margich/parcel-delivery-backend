import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private paymentsService;
    constructor(paymentsService: PaymentsService);
    initiateStk(req: any, body: {
        orderId: string;
        phoneNumber: string;
        amount: number;
    }): Promise<{
        message: string;
        transactionId: string;
        checkoutRequestId: string;
    }>;
    mpesaCallback(body: any): Promise<void>;
    withdraw(req: any, body: {
        amount: number;
    }): Promise<{
        message: string;
        transactionId: string;
    }>;
}
