'use client';

import { useTransition } from 'react';
import { syncPRs, runDeltaSyncPRs } from '@/lib/actions';

interface Props {
  owner: string;
  repo: string;
  lastPrPollAt: string | null;
  isOwned: boolean;
}

export function RefreshPRsButton({ owner, repo, lastPrPollAt, isOwned }: Props) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      if (lastPrPollAt) {
        await runDeltaSyncPRs(owner, repo, lastPrPollAt, isOwned);
      } else {
        await syncPRs(owner, repo);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {pending ? 'Refreshing…' : 'Refresh'}
    </button>
  );
}
