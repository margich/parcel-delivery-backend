import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(fromUserId: string, data: any) {
    const { parcelRequestId, toUserId, rating, comment } = data;

    // 1. Create the review
    const review = await this.prisma.review.create({
      data: {
        parcelRequestId,
        fromUserId,
        toUserId,
        rating,
        comment,
      },
    });

    // 2. Check if the recipient is a courier and update courier profile ratings
    const courierProfile = await this.prisma.courierProfile.findUnique({
      where: { userId: toUserId },
    });

    if (courierProfile) {
      // Update courier profile ratings
      const courierReviews = await this.prisma.review.findMany({
        where: { toUserId },
        select: { rating: true },
      });

      const ratingSum = courierReviews.reduce(
        (acc: number, curr: { rating: number }) => acc + curr.rating,
        0,
      );

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
    } else {
      // Update regular user ratings
      const userReviews = await this.prisma.review.findMany({
        where: { toUserId },
        select: { rating: true },
      });

      const ratingSum = userReviews.reduce(
        (acc: number, curr: { rating: number }) => acc + curr.rating,
        0,
      );

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

  async getReviewsForUser(userId: string) {
    return this.prisma.review.findMany({
      where: { toUserId: userId },
      include: {
        fromUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
