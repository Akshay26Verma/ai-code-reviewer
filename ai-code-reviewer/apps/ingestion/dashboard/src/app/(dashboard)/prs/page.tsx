import { apiClient } from '@/lib/api';
import type { UserRepo } from '@/types';
import { RepoSearchTable } from '@/components/repo-search-table';

export default async function PrsPage() {
  const res = await apiClient.getUserRepos();
  const repos: UserRepo[] = res.ok ? await res.json() : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pull Requests</h1>
        <p className="mt-1 text-sm text-gray-500">
          Select a repository to browse its open pull requests.
        </p>
      </div>
      <RepoSearchTable repos={repos} />
    </div>
  );
}
