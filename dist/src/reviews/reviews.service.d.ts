import { PrismaService } from '../prisma/prisma.service';
export declare class ReviewsService {
    private prisma;
    constructor(prisma: PrismaService);
    createReview(fromUserId: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        parcelRequestId: string;
        fromUserId: string;
        toUserId: string;
        rating: number;
        comment: string | null;
    }>;
    getReviewsForUser(userId: string): Promise<({
        fromUser: {
            name: string;
            id: string;
        };
    } & {
        id: string;
        createdAt: Date;
        parcelRequestId: string;
        fromUserId: string;
        toUserId: string;
        rating: number;
        comment: string | null;
    })[]>;
}
