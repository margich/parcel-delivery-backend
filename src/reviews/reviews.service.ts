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

    // 2. Update the overallRating of the target user
    const recipientReviews = await this.prisma.review.findMany({
      where: { toUserId },
      select: { rating: true },
    });

    const averageRating =
      recipientReviews.reduce(
        (acc: number, curr: { rating: number }) => acc + curr.rating,
        0,
      ) / recipientReviews.length;

    await this.prisma.user.update({
      where: { id: toUserId },
      data: { overallRating: averageRating },
    });

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
