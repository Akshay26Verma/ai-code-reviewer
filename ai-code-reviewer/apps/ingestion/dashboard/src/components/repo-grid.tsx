'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { UserRepo } from '@/types';
import { IndexRepoButton } from '@/components/index-repo-button';
import { DeleteRepoButton } from '@/components/delete-repo-button';
import { Pagination } from '@/components/pagination';

const PAGE_SIZE_OPTIONS = [6, 12, 24];
const DEFAULT_PAGE_SIZE = 12;

interface Props {
  repos: UserRepo[];
}

export function RepoGrid({ repos }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const totalPages = Math.max(1, Math.ceil(repos.length / pageSize));
  const paginated = repos.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setCurrentPage(1);
  }

  if (repos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-sm text-gray-500">No repositories yet.</p>
        <p className="mt-1 text-xs text-gray-400">
          Click <strong>Sync Repos</strong> to import your GitHub repositories.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paginated.map((repo) => (
          <RepoCard key={repo.id} repo={repo} />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={handlePageSizeChange}
        totalItems={repos.length}
      />
    </div>
  );
}

function RepoCard({ repo }: { repo: UserRepo }) {
  const lastSync = repo.lastPrPollAt
    ? new Date(repo.lastPrPollAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never synced';

  return (
    <div className="group relative rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md hover:border-gray-300">
      <Link href={`/repos/${repo.owner}/${repo.name}/prs`} className="block p-5">
        <div className="min-w-0 pr-10">
          <div className="flex items-center gap-2">
            <p className="truncate text-xs text-gray-400">{repo.owner}</p>
            {!repo.isOwned && (
              <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                contributor
              </span>
            )}
          </div>
          <h2 className="truncate text-sm font-semibold text-gray-900 group-hover:text-gray-700">
            {repo.name}
          </h2>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span>
            {repo.openPrCount === 0
              ? 'No open PRs'
              : `${repo.openPrCount} open PR${repo.openPrCount !== 1 ? 's' : ''}`}
          </span>
          <span className="text-gray-400">{lastSync}</span>
        </div>
      </Link>

      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <IndexRepoButton variant="card" />
        <DeleteRepoButton owner={repo.owner} name={repo.name} fullName={repo.fullName} />
      </div>
    </div>
  );
}
