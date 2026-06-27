'use client';

import { useState, useTransition } from 'react';
import { requestReview } from '@/lib/actions';

interface Props {
  owner: string;
  repo: string;
  prNumber: number;
}

export function RequestReviewButton({ owner, repo, prNumber }: Props) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  function handleClick() {
    setStatus(null);
    startTransition(async () => {
      const result = await requestReview(owner, repo, prNumber);
      if (result.error) {
        setStatus({ ok: false, message: result.error });
      } else {
        setStatus({ ok: true, message: 'Review queued. Refresh the page in a moment to see results.' });
      }
    });
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={pending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {pending ? 'Queuing…' : 'Request Review'}
      </button>
      {status && (
        <p className={`text-sm ${status.ok ? 'text-green-600' : 'text-red-600'}`}>
          {status.message}
        </p>
      )}
    </div>
  );
}
