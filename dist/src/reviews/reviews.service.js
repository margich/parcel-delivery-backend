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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReviewsService = class ReviewsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createReview(fromUserId, data) {
        const { parcelRequestId, toUserId, rating, comment } = data;
        const review = await this.prisma.review.create({
            data: {
                parcelRequestId,
                fromUserId,
                toUserId,
                rating,
                comment,
            },
        });
        const courierProfile = await this.prisma.courierProfile.findUnique({
            where: { userId: toUserId },
        });
        if (courierProfile) {
            const courierReviews = await this.prisma.review.findMany({
                where: { toUserId },
                select: { rating: true },
            });
            const ratingSum = courierReviews.reduce((acc, curr) => acc + curr.rating, 0);
            const ratingCount = courierReviews.length;
            const averageRating = ratingCount > 0 ? ratingSum / ratingCount : 5.0;
            await this.prisma.courierProfile.update({
                where: { userId: toUserId },
                data: {
                    overallRating: averageRating,
                    ratingCount,
                    ratingSum,
                },
            });
        }
        else {
            const userReviews = await this.prisma.review.findMany({
                where: { toUserId },
                select: { rating: true },
            });
            const ratingSum = userReviews.reduce((acc, curr) => acc + curr.rating, 0);
            const ratingCount = userReviews.length;
            const averageRating = ratingCount > 0 ? ratingSum / ratingCount : 5.0;
            await this.prisma.user.update({
                where: { id: toUserId },
                data: {
                    overallRating: averageRating,
                    ratingCount,
                    ratingSum,
                },
            });
        }
        return review;
    }
    async getReviewsForUser(userId) {
        return this.prisma.review.findMany({
            where: { toUserId: userId },
            include: {
                fromUser: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map