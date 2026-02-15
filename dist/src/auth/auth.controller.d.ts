import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(registerDto: any): Promise<{
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
    login(req: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            phoneNumber: any;
            mpesaNumber: any;
            role: any;
            defaultRole: any;
        };
    } | {
        message: string;
    }>;
    getProfile(req: any): any;
    updateProfile(req: any, updateDto: any): Promise<{
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
