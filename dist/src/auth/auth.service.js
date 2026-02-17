"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    jwtService;
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async register(data) {
        const { phoneNumber, name, role, password, ...courierData } = data;
        const existingUser = await this.prisma.user.findUnique({
            where: { phoneNumber },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Phone number already registered');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.prisma.user.create({
            data: {
                phoneNumber,
                name,
                password: hashedPassword,
                role,
                activeRole: role,
                defaultRole: role,
            },
        });
        if (role === 'COURIER') {
            await this.prisma.courierProfile.create({
                data: {
                    userId: user.id,
                    vehicleType: courierData.vehicleType,
                    vehiclePhotoUrl: courierData.vehiclePhotoUrl,
                    plateNumber: courierData.plateNumber,
                    idCardFrontPhotoUrl: courierData.idCardFrontPhotoUrl,
                    idCardBackPhotoUrl: courierData.idCardBackPhotoUrl,
                    payoutMpesaNumber: courierData.payoutMpesaNumber,
                },
            });
        }
        return this.login(user);
    }
    async validateUser(phoneNumber, pass) {
        const user = await this.prisma.user.findUnique({ where: { phoneNumber } });
        if (user && (await bcrypt.compare(pass, user.password))) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }
    async login(user) {
        const payload = {
            sub: user.id,
            phoneNumber: user.phoneNumber,
            role: user.activeRole || user.role,
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                name: user.name,
                phoneNumber: user.phoneNumber,
                mpesaNumber: user.mpesaNumber,
                role: user.activeRole || user.role,
                defaultRole: user.defaultRole,
            },
        };
    }
    async getUserById(userId) {
        return await this.prisma.user.findUnique({
            where: { id: userId },
            include: { courierProfile: true },
        });
    }
    async updateProfile(userId, data) {
        const { name, vehicleType, vehiclePhotoUrl, plateNumber, idCardFrontPhotoUrl, idCardBackPhotoUrl, payoutMpesaNumber, mpesaNumber, } = data;
        const wantsToBecomeCourier = !!(vehicleType ||
            vehiclePhotoUrl ||
            plateNumber ||
            idCardFrontPhotoUrl ||
            idCardBackPhotoUrl ||
            payoutMpesaNumber);
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(name && { name }),
                ...(mpesaNumber && { mpesaNumber }),
                ...(wantsToBecomeCourier && {
                    role: 'COURIER',
                    activeRole: 'COURIER',
                    defaultRole: 'COURIER',
                }),
            },
            include: { courierProfile: true },
        });
        if (updatedUser.role === 'COURIER' &&
            wantsToBecomeCourier &&
            !updatedUser.courierProfile) {
            await this.prisma.courierProfile.create({
                data: {
                    userId,
                    vehicleType: vehicleType || 'BIKE',
                    vehiclePhotoUrl,
                    plateNumber,
                    idCardFrontPhotoUrl,
                    idCardBackPhotoUrl,
                    payoutMpesaNumber,
                },
            });
        }
        if (updatedUser.role === 'COURIER' &&
            (vehicleType ||
                plateNumber ||
                vehiclePhotoUrl ||
                idCardFrontPhotoUrl ||
                idCardBackPhotoUrl ||
                payoutMpesaNumber)) {
            await this.prisma.courierProfile.update({
                where: { userId },
                data: {
                    ...(vehicleType && { vehicleType }),
                    ...(vehiclePhotoUrl && { vehiclePhotoUrl }),
                    ...(plateNumber && { plateNumber }),
                    ...(idCardFrontPhotoUrl && { idCardFrontPhotoUrl }),
                    ...(idCardBackPhotoUrl && { idCardBackPhotoUrl }),
                    ...(payoutMpesaNumber && { payoutMpesaNumber }),
                },
            });
        }
        const userForToken = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { courierProfile: true },
        });
        return this.login(userForToken);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map