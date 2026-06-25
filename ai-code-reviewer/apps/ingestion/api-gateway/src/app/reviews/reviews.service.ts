import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPrId(prId: string) {
    return this.prisma.review.findMany({
      where: { prId: parseInt(prId, 10) },
      include: { comments: true },
    });
  }
}
