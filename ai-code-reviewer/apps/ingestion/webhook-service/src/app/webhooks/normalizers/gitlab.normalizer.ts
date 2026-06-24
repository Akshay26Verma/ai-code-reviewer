import { Injectable } from '@nestjs/common';
import { NormalizeResult } from './normalizer.interface';

@Injectable()
export class GitlabNormalizer {
  normalize(payload: any): NormalizeResult {
    const project = payload.project;
    const attrs = payload.object_attributes;

    const repoId: string = project.path_with_namespace;
    const orgId: string = project.namespace;
    const mrIid: number = attrs.iid;
    const commitSha: string = attrs.last_commit?.id ?? attrs.merge_commit_sha ?? '';
    const projectId: string | number = project.id;

    const isMerge = attrs.state === 'merged' || attrs.action === 'merge';
    const action = isMerge
      ? 'merged'
      : attrs.action === 'open' || attrs.action === 'reopen'
        ? 'opened'
        : attrs.action === 'close'
          ? 'closed'
          : 'updated';

    return {
      event: {
        repo_id: repoId,
        org_id: orgId,
        pr_id: mrIid,
        action,
        commit_sha: commitSha,
        provider: 'gitlab',
      },
      isMerge,
      scmMeta: {
        provider: 'gitlab',
        projectId,
        mrIid,
        commitSha,
      },
    };
  }
}
