import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { PrDetail } from '@/components/pr-detail';
import type { Review } from '@/types';

interface Props {
  params: { prId: string };
}

export default async function PrDetailPage({ params }: Props) {
  const { prId } = params;

  const res = await apiClient.getReviews(prId);
  if (res.status === 404) notFound();
  if (!res.ok) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load review data (status {res.status}).
      </div>
    );
  }

  const reviews: Review[] = await res.json();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">PR #{prId}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {reviews.length} review{reviews.length !== 1 ? 's' : ''} found
        </p>
      </div>
      <PrDetail prId={prId} reviews={reviews} />
    </div>
  );
}
