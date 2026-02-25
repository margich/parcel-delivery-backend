"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LocationCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
let LocationCronService = LocationCronService_1 = class LocationCronService {
    redis;
    prisma;
    logger = new common_1.Logger(LocationCronService_1.name);
    constructor(redis, prisma) {
        this.redis = redis;
        this.prisma = prisma;
    }
    async persistLocations() {
        try {
            this.logger.debug('Running cron: persistLocations');
            const keys = await this.redis.keys('courier:*:location');
            if (!keys || keys.length === 0)
                return;
            const recordsToCreate = [];
            for (const key of keys) {
                const data = await this.redis.hgetall(key);
                if (!data || !data.lat || !data.lng || !data.profileId)
                    continue;
                const courierId = String(data.profileId);
                const lat = Number(data.lat);
                const lng = Number(data.lng);
                if (!isNaN(lat) && !isNaN(lng)) {
                    recordsToCreate.push({
                        courierId,
                        lat,
                        lng,
                    });
                }
            }
            if (recordsToCreate.length > 0) {
                await this.prisma.courierLocationHistory.createMany({
                    data: recordsToCreate,
                });
                this.logger.debug(`Persisted ${recordsToCreate.length} courier locations to DB.`);
            }
        }
        catch (error) {
            this.logger.error('Failed to persist locations in cron job', error);
        }
    }
};
exports.LocationCronService = LocationCronService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LocationCronService.prototype, "persistLocations", null);
exports.LocationCronService = LocationCronService = LocationCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        prisma_service_1.PrismaService])
], LocationCronService);
//# sourceMappingURL=location-cron.service.js.map