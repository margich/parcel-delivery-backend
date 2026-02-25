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
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const redis_1 = require("@upstash/redis");
let RedisService = RedisService_1 = class RedisService {
    configService;
    logger = new common_1.Logger(RedisService_1.name);
    redisClient;
    constructor(configService) {
        this.configService = configService;
        const url = this.configService.get('UPSTASH_REDIS_REST_URL');
        const token = this.configService.get('UPSTASH_REDIS_REST_TOKEN');
        if (!url || !token) {
            this.logger.warn('UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing. Redis functions will fail.');
        }
        this.redisClient = new redis_1.Redis({
            url: url || '',
            token: token || '',
        });
    }
    getClient() {
        return this.redisClient;
    }
    async hset(key, data) {
        return await this.redisClient.hset(key, data);
    }
    async hgetall(key) {
        return await this.redisClient.hgetall(key);
    }
    async keys(pattern) {
        return await this.redisClient.keys(pattern);
    }
    async expire(key, seconds) {
        return await this.redisClient.expire(key, seconds);
    }
    async geoadd(key, longitude, latitude, member) {
        const result = await this.redisClient.geoadd(key, { longitude, latitude, member });
        return result ?? 0;
    }
    async geosearch(key, longitude, latitude, radius, unit = 'km') {
        const results = await this.redisClient.geosearch(key, {
            type: "fromlonlat",
            coordinate: { lon: longitude, lat: latitude },
        }, {
            type: "byradius",
            radius,
            radiusType: unit.toUpperCase(),
        }, "ASC");
        if (!results || !Array.isArray(results))
            return [];
        return results.map(res => {
            if (typeof res === 'string')
                return res;
            if (res && typeof res === 'object' && 'member' in res)
                return res.member;
            return String(res);
        });
    }
    async setLock(key, value, ttlSeconds) {
        const result = await this.redisClient.set(key, value, {
            nx: true,
            ex: ttlSeconds,
        });
        return result === 'OK';
    }
    async del(key) {
        return await this.redisClient.del(key);
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map