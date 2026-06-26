import { auth } from './auth';

const GATEWAY = process.env.API_GATEWAY_URL ?? 'http://localhost:3003';

async function gatewayFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = await auth();
  const token = session?.apiToken;
  return fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
}

export const apiClient = {
  getReviews: (prId: string) => gatewayFetch(`/reviews/${prId}`),
  getDeveloperInsights: (id: string) => gatewayFetch(`/insights/developer/${id}`),
  getTeamInsights: (id: string) => gatewayFetch(`/insights/team/${id}`),
  analyze: (body: unknown) =>
    gatewayFetch('/analyze', { method: 'POST', body: JSON.stringify(body) }),
  reindex: (repoId: string) =>
    gatewayFetch(`/index/${repoId}/reindex`, { method: 'POST', body: '{}' }),
};
