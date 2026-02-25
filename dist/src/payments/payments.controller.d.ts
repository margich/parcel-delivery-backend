import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private paymentsService;
    constructor(paymentsService: PaymentsService);
    initiateStk(req: any, body: {
        orderData: any;
        phoneNumber: string;
        amount: number;
    }): Promise<{
        success: boolean;
        message: string;
        checkoutRequestId: any;
        transactionId: string;
    }>;
    mpesaCallback(body: any): Promise<{
        id: string;
        phoneNumber: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.TransactionStatus;
        parcelRequestId: string | null;
        type: import("@prisma/client").$Enums.TransactionType;
        amount: import("@prisma/client-runtime-utils").Decimal;
        mpesaReference: string | null;
        gatewayResponse: import("@prisma/client/runtime/client").JsonValue | null;
        failureReason: string | null;
    } | {
        success: boolean;
        message: any;
    }>;
    withdraw(req: any, body: {
        amount: number;
    }): Promise<{
        success: boolean;
        message: string;
        amount: number;
    }>;
}
