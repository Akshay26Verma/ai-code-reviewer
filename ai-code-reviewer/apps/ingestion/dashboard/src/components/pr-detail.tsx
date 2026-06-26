import type { Review } from '@/types';
import { DiffComment } from './diff-comment';
import { ActionButtons } from './action-buttons';

interface PrDetailProps {
  prId: string;
  reviews: Review[];
}

export function PrDetail({ prId, reviews }: PrDetailProps) {
  if (reviews.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">No reviews found for PR #{prId}.</p>
          <p className="mt-1 text-xs text-gray-400">
            Trigger a manual analysis below, or wait for the pipeline to process a merge event.
          </p>
        </div>
        <ActionButtons prId={Number(prId)} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Review
              </span>
              <p className="mt-0.5 font-mono text-sm text-gray-900">{review.id}</p>
            </div>
            <StatusBadge status={review.status} />
          </div>

          {review.comments.length === 0 ? (
            <p className="text-sm text-gray-400">No inline comments for this review.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500">
                {review.comments.length} comment{review.comments.length !== 1 ? 's' : ''}
              </p>
              {review.comments.map((comment) => (
                <DiffComment key={comment.id} comment={comment} />
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-gray-100 pt-4">
            <ActionButtons prId={review.prId} repoId={review.repoId} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  );
}
