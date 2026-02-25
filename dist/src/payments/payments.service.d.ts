import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
export declare class PaymentsService {
    private prisma;
    private trackingGateway;
    private configService;
    constructor(prisma: PrismaService, trackingGateway: TrackingGateway, configService: ConfigService);
    private get mpesaConfig();
    getAccessToken(): Promise<any>;
    initiateStkPush(userId: string, orderData: any, phoneNumber: string, amount: number): Promise<{
        success: boolean;
        message: string;
        checkoutRequestId: any;
        transactionId: string;
    }>;
    handleMpesaCallback(body: any): Promise<{
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
    withdrawToMpesa(courierId: string, amount: number): Promise<{
        success: boolean;
        message: string;
        amount: number;
    }>;
}
