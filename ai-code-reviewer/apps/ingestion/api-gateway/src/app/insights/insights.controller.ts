import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { InsightsService } from './insights.service';

@Controller('insights')
@UseGuards(JwtGuard)
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('developer/:id')
  getDeveloperInsights(@Param('id') id: string) {
    return this.insightsService.getDeveloperInsights(id);
  }

  @Get('team/:id')
  getTeamSummary(@Param('id') id: string) {
    return this.insightsService.getTeamSummary(id);
  }
}
