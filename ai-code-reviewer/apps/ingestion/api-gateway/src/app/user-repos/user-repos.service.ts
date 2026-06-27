import { Injectable } from '@nestjs/common';
import { UserRepo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertRepoDto {
  owner: string;
  name: string;
  fullName: string;
  isOwned: boolean;
}

@Injectable()
export class UserReposService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userLogin: string) {
    const repos: UserRepo[] = await this.prisma.userRepo.findMany({ where: { userLogin } });
    const counts = await this.prisma.pullRequest.groupBy({
      by: ['owner', 'repo'],
      where: {
        owner: { in: repos.map((r: UserRepo) => r.owner) },
        repo: { in: repos.map((r: UserRepo) => r.name) },
        state: 'open',
      },
      _count: { prNumber: true },
    });
    const countMap = new Map(
      counts.map((c: { owner: string; repo: string; _count: { prNumber: number } }) => [
        `${c.owner}/${c.repo}`,
        c._count.prNumber,
      ]),
    );
    return repos.map((r: UserRepo) => ({ ...r, openPrCount: countMap.get(r.fullName) ?? 0 }));
  }

  async bulkUpsert(userLogin: string, repos: UpsertRepoDto[]) {
    await Promise.all(
      repos.map((r) =>
        this.prisma.userRepo.upsert({
          where: { userLogin_fullName: { userLogin, fullName: r.fullName } },
          create: { userLogin, ...r },
          update: { owner: r.owner, name: r.name, isOwned: r.isOwned },
        }),
      ),
    );
    return { upserted: repos.length };
  }

  addCustom(userLogin: string, repo: UpsertRepoDto) {
    return this.prisma.userRepo.upsert({
      where: { userLogin_fullName: { userLogin, fullName: repo.fullName } },
      create: { userLogin, ...repo },
      update: { owner: repo.owner, name: repo.name, isOwned: repo.isOwned },
    });
  }

  remove(userLogin: string, owner: string, name: string) {
    return this.prisma.$transaction([
      this.prisma.userRepo.deleteMany({ where: { userLogin, owner, name } }),
      this.prisma.pullRequest.deleteMany({ where: { owner, repo: name } }),
    ]);
  }
}
