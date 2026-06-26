import { notFound } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { InsightsPanel } from '@/components/insights-panel';

interface Props {
  params: { type: string; id: string };
}

export default async function InsightsPage({ params }: Props) {
  const { type, id } = params;

  if (type !== 'developer' && type !== 'team') notFound();

  const res =
    type === 'developer'
      ? await apiClient.getDeveloperInsights(id)
      : await apiClient.getTeamInsights(id);

  if (!res.ok) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load insights (status {res.status}).
      </div>
    );
  }

  const data = await res.json();
  const title = type === 'developer' ? `Developer Insights — ${id}` : `Team Summary — ${id}`;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{title}</h1>
      <InsightsPanel type={type as 'developer' | 'team'} id={id} data={data} />
    </div>
  );
}
