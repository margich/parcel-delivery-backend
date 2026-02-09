import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
export declare class PrismaService implements OnModuleInit, OnModuleDestroy {
    private prisma;
    private pool;
    constructor();
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    get user(): import("@prisma/client").Prisma.UserDelegate<import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    get courierProfile(): import("@prisma/client").Prisma.CourierProfileDelegate<import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    get parcelRequest(): import("@prisma/client").Prisma.ParcelRequestDelegate<import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    get transaction(): import("@prisma/client").Prisma.TransactionDelegate<import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    get review(): import("@prisma/client").Prisma.ReviewDelegate<import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}
