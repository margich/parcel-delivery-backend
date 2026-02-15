import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(data: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            phoneNumber: any;
            mpesaNumber: any;
            role: any;
            defaultRole: any;
        };
    }>;
    validateUser(phoneNumber: string, pass: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            phoneNumber: any;
            mpesaNumber: any;
            role: any;
            defaultRole: any;
        };
    }>;
    updateProfile(userId: string, data: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            phoneNumber: any;
            mpesaNumber: any;
            role: any;
            defaultRole: any;
        };
    }>;
}
