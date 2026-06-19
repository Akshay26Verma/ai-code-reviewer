import { Controller, Get, Post, Body, Param, UsePipes } from '@nestjs/common';
import { GraphService } from './graph.service';
import { GraphPatchSchema, GraphPatch } from './graph.schemas';
import { ZodValidationPipe } from '../utils/zod-validation.pipe';

@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get('callers/:fnId')
  async getCallers(@Param('fnId') fnId: string) {
    return this.graphService.getCallers(fnId);
  }

  @Get('dependencies/:moduleId')
  async getDependencies(@Param('moduleId') moduleId: string) {
    return this.graphService.getDependencies(moduleId);
  }

  @Get('impact/:fnId')
  async getImpact(@Param('fnId') fnId: string) {
    return this.graphService.getImpact(fnId);
  }

  @Get('risk/*filePath')
  async getRisk(@Param('filePath') filePath: string) {
    return this.graphService.getRisk(filePath);
  }

  @Get('recent-changes/:repoId')
  async getRecentChanges(@Param('repoId') repoId: string) {
    return this.graphService.getRecentChanges(repoId);
  }

  @Post('patch')
  @UsePipes(new ZodValidationPipe(GraphPatchSchema))
  async applyPatch(@Body() patch: GraphPatch) {
    return this.graphService.applyPatch(patch);
  }
}
