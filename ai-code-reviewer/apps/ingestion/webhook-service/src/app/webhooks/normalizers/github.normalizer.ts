import { Injectable } from '@nestjs/common';
import { NormalizeResult } from './normalizer.interface';

@Injectable()
export class GithubNormalizer {
  normalize(payload: any): NormalizeResult {
    const repo = payload.repository;
    const pr = payload.pull_request;
    const installation = payload.installation;

    const owner: string = repo.owner.login;
    const repoName: string = repo.name;
    const repoId = `${owner}/${repoName}`;
    const orgId: string = payload.organization?.login ?? owner;
    const prNumber: number = pr.number;
    const commitSha: string = pr.head.sha;
    const installationId: number = installation?.id ?? 0;

    const actionMap: Record<string, 'opened' | 'updated' | 'closed' | 'merged'> = {
      opened: 'opened',
      reopened: 'opened',
      synchronize: 'updated',
      closed: 'closed',
    };

    const isMerge = payload.action === 'closed' && pr.merged === true;
    const action = isMerge ? 'merged' : (actionMap[payload.action] ?? 'updated');

    return {
      event: {
        repo_id: repoId,
        org_id: orgId,
        pr_id: prNumber,
        action,
        commit_sha: commitSha,
        provider: 'github',
      },
      isMerge,
      scmMeta: {
        provider: 'github',
        owner,
        repo: repoName,
        prNumber,
        installationId,
      },
    };
  }
}
