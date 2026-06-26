import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api';

export async function POST(
  _request: NextRequest,
  { params }: { params: { repoId: string } },
) {
  try {
    const upstream = await apiClient.reindex(params.repoId);
    const data: unknown = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'Failed to trigger reindex' }, { status: 500 });
  }
}
