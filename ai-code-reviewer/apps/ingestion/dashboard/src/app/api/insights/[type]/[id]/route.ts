import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: { type: string; id: string } },
) {
  const { type, id } = params;
  try {
    let upstream: Response;
    if (type === 'developer') {
      upstream = await apiClient.getDeveloperInsights(id);
    } else if (type === 'team') {
      upstream = await apiClient.getTeamInsights(id);
    } else {
      return NextResponse.json({ error: 'Invalid insight type' }, { status: 400 });
    }
    const data: unknown = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
  }
}
