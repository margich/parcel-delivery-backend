import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post()
  async create(@Request() req: any, @Body() reviewDto: any) {
    return this.reviewsService.createReview(req.user.id, reviewDto);
  }

  @Get('user/:id')
  async getForUser(@Param('id') id: string) {
    return this.reviewsService.getReviewsForUser(id);
  }
}
