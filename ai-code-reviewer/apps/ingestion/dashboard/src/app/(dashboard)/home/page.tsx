import { apiClient } from '@/lib/api';
import type { UserRepo } from '@/types';
import { SyncReposButton } from '@/components/sync-repos-button';
import { AddRepoDialog } from '@/components/add-repo-dialog';
import { RepoGrid } from '@/components/repo-grid';

export default async function HomePage() {
  const res = await apiClient.getUserRepos();
  const repos: UserRepo[] = res.ok ? await res.json() : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repositories</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your connected repos. Click a card to view open PRs.
          </p>
        </div>
        <div className="flex gap-2">
          <SyncReposButton />
          <AddRepoDialog />
        </div>
      </div>

      <RepoGrid repos={repos} />
    </div>
  );
}
