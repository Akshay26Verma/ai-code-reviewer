'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PrList() {
  const [prId, setPrId] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = prId.trim();
    if (id) router.push(`/prs/${encodeURIComponent(id)}`);
  }

  return (
    <div className="max-w-lg">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Find a PR Review</h2>
        <p className="mb-4 text-sm text-gray-500">
          Enter a PR ID to view its automated review and inline comments.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={prId}
            onChange={(e) => setPrId(e.target.value)}
            placeholder="e.g. 42"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            disabled={!prId.trim()}
          >
            View
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Reviews are created automatically when PRs are merged. Use the&nbsp;
        <strong>Request Review</strong> action to trigger a manual analysis.
      </p>
    </div>
  );
}
