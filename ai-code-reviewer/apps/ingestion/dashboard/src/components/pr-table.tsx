'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { PullRequest } from '@/types';
import { Pagination } from '@/components/pagination';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const DEFAULT_PAGE_SIZE = 10;

interface Props {
  owner: string;
  repo: string;
  prs: PullRequest[];
}

export function PRTable({ owner, repo, prs }: Props) {
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const router = useRouter();

  const filtered = prs.filter((pr) => {
    const q = query.toLowerCase();
    return (
      String(pr.prNumber).includes(q) ||
      pr.title.toLowerCase().includes(q) ||
      pr.commitSha.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, pageSize]);

  function handlePageSizeChange(size: number) {
    setPageSize(size);
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter by PR #, title, or commit SHA…"
        className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400">{prs.length === 0 ? 'No open PRs cached.' : 'No matches.'}</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                  <th className="px-4 py-3 w-16">PR #</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3 font-mono">Commit</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((pr) => (
                  <tr
                    key={pr.id}
                    onClick={() => router.push(`/repos/${owner}/${repo}/prs/${pr.prNumber}`)}
                    className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-gray-500">#{pr.prNumber}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{pr.title}</td>
                    <td className="px-4 py-3 text-gray-500">{pr.author}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {pr.commitSha.slice(0, 7)}
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
            onPageSizeChange={handlePageSizeChange}
            totalItems={filtered.length}
          />
        </>
      )}
    </div>
  );
}
