import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertPrDto {
  prNumber: number;
  title: string;
  author: string;
  state?: string;
  commitSha?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ReposService {
  constructor(private readonly prisma: PrismaService) {}

  listPRs(owner: string, repo: string) {
    return this.prisma.pullRequest.findMany({ where: { owner, repo } });
  }

  async bulkUpsertPRs(owner: string, repo: string, prs: UpsertPrDto[], userLogin: string) {
    await Promise.all(
      prs.map((pr) =>
        this.prisma.pullRequest.upsert({
          where: { owner_repo_prNumber: { owner, repo, prNumber: pr.prNumber } },
          create: {
            owner,
            repo,
            prNumber: pr.prNumber,
            title: pr.title,
            author: pr.author,
            state: pr.state ?? 'open',
            commitSha: pr.commitSha ?? '',
            createdAt: new Date(pr.createdAt),
            updatedAt: new Date(pr.updatedAt),
            cachedAt: new Date(),
          },
          update: {
            title: pr.title,
            author: pr.author,
            state: pr.state ?? 'open',
            ...(pr.commitSha && { commitSha: pr.commitSha }),
            updatedAt: new Date(pr.updatedAt),
            cachedAt: new Date(),
          },
        }),
      ),
    );

    // Update lastPrPollAt on the UserRepo entry
    await this.prisma.userRepo.updateMany({
      where: { userLogin, fullName: `${owner}/${repo}` },
      data: { lastPrPollAt: new Date() },
    });

    return { upserted: prs.length };
  }

  listReviews(owner: string, repo: string, prNumber: number) {
    const repoId = `${owner}/${repo}`;
    return this.prisma.review.findMany({
      where: { repoId, prId: prNumber },
      include: { comments: true },
    });
  }
}
