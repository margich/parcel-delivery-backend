import { Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(prisma: PrismaService);
    validate(payload: any): Promise<{
        name: string;
        id: string;
        phoneNumber: string;
        password: string;
        role: import("@prisma/client").$Enums.Role;
        activeRole: import("@prisma/client").$Enums.Role;
        defaultRole: import("@prisma/client").$Enums.Role;
        overallRating: number;
        lastLogin: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
