import { ReviewsService } from './reviews.service';
export declare class ReviewsController {
    private reviewsService;
    constructor(reviewsService: ReviewsService);
    create(req: any, reviewDto: any): Promise<{
        id: string;
        createdAt: Date;
        parcelRequestId: string;
        fromUserId: string;
        toUserId: string;
        rating: number;
        comment: string | null;
    }>;
    getForUser(id: string): Promise<({
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
