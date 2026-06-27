'use client';

import { useState, useTransition } from 'react';
import { syncRepos } from '@/lib/actions';

export function SyncReposButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await syncRepos();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sync failed');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? 'Syncing…' : 'Sync Repos'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
