import { apiClient } from '@/lib/api';
import type { Review } from '@/types';
import { DiffComment } from '@/components/diff-comment';
import { RequestReviewButton } from '@/components/request-review-button';

interface Props {
  params: { owner: string; repo: string; prNumber: string };
}

export default async function PRDetailPage({ params }: Props) {
  const { owner, repo, prNumber } = params;
  const prNum = parseInt(prNumber, 10);

  const res = await apiClient.getPRReviews(owner, repo, prNum);
  const reviews: Review[] = res.ok ? await res.json() : [];

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs text-gray-400">
          {owner}/{repo}
        </p>
        <h1 className="text-2xl font-bold text-gray-900">PR #{prNumber}</h1>
      </div>

      {reviews.length === 0 ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">No reviews found for this PR.</p>
            <p className="mt-1 text-xs text-gray-400">
              Click below to trigger an automated review. The result will appear here once processed.
            </p>
          </div>
          <RequestReviewButton owner={owner} repo={repo} prNumber={prNum} />
        </div>
      ) : (
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
                <p className="text-sm text-gray-400">No inline comments.</p>
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
            </div>
          ))}
        </div>
      )}
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
