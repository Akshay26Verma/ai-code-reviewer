'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamInsightsIndexPage() {
  const router = useRouter();
  const [id, setId] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = id.trim();
    if (trimmed) router.push(`/insights/team/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Team Insights</h1>
        <p className="mt-1 text-sm text-gray-500">Enter a team ID to view its risk summary.</p>
      </div>

      <div className="max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="team-id" className="mb-1 block text-sm font-medium text-gray-700">
              Team ID
            </label>
            <input
              id="team-id"
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g. platform-eng"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
          <button
            type="submit"
            disabled={!id.trim()}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            View Summary
          </button>
        </form>
        <p className="mt-4 text-xs text-gray-400">
          Metrics are populated by the Aggregator service after code reviews complete.
        </p>
      </div>
    </div>
  );
}
