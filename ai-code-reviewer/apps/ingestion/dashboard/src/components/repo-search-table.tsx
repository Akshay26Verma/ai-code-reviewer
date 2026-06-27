'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRepo } from '@/types';
import { Pagination } from '@/components/pagination';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const DEFAULT_PAGE_SIZE = 10;

export function RepoSearchTable({ repos }: { repos: UserRepo[] }) {
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const router = useRouter();

  const filtered = repos.filter((r) =>
    r.fullName.toLowerCase().includes(query.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, pageSize]);

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter by owner or repo name…"
        className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400">
          {repos.length === 0
            ? 'No repositories yet. Go to Home and click Sync Repos.'
            : 'No matches.'}
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3">Repository</th>
                  <th className="px-4 py-3">Open PRs</th>
                  <th className="px-4 py-3">Last synced</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((repo) => (
                  <tr
                    key={repo.id}
                    onClick={() => router.push(`/repos/${repo.owner}/${repo.name}/prs`)}
                    className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{repo.fullName}</td>
                    <td className="px-4 py-3 text-gray-500">{repo.openPrCount}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {repo.lastPrPollAt
                        ? new Date(repo.lastPrPollAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={setPageSize}
            totalItems={filtered.length}
          />
        </>
      )}
    </div>
  );
}
