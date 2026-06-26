import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const upstream = await apiClient.analyze(body);
    const data: unknown = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: 'Failed to forward request to api-gateway' }, { status: 500 });
  }
}
