import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
@UseGuards(JwtGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get(':prId')
  getReview(@Param('prId') prId: string) {
    return this.reviewsService.findByPrId(prId);
  }
}
