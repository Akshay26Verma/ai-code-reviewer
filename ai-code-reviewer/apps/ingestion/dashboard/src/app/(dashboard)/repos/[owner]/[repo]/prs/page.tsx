import { apiClient } from '@/lib/api';
import type { PullRequest, UserRepo } from '@/types';
import { PRTable } from '@/components/pr-table';
import { RefreshPRsButton } from '@/components/refresh-prs-button';
import { IndexRepoButton } from '@/components/index-repo-button';

interface Props {
  params: { owner: string; repo: string };
}

export default async function RepoPRsPage({ params }: Props) {
  const { owner, repo } = params;

  const [prsRes, reposRes] = await Promise.all([
    apiClient.getPRs(owner, repo),
    apiClient.getUserRepos(),
  ]);

  const prs: PullRequest[] = prsRes.ok ? await prsRes.json() : [];
  const userRepos: UserRepo[] = reposRes.ok ? await reposRes.json() : [];
  const userRepo = userRepos.find((r) => r.owner === owner && r.name === repo);

  const neverSynced = prs.length === 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">{owner}</p>
          <h1 className="text-2xl font-bold text-gray-900">{repo}</h1>
          <p className="mt-1 text-sm text-gray-500">Open pull requests</p>
        </div>
        <div className="flex gap-2">
          <IndexRepoButton variant="button" />
          <RefreshPRsButton
            owner={owner}
            repo={repo}
            lastPrPollAt={userRepo?.lastPrPollAt ?? null}
            isOwned={userRepo?.isOwned ?? true}
          />
        </div>
      </div>

      {neverSynced && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          No cached PRs yet — click <strong>Refresh</strong> to load them from GitHub.
        </div>
      )}

      <PRTable owner={owner} repo={repo} prs={prs} />
    </div>
  );
}
