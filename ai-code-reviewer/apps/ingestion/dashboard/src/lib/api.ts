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
  // UserRepo endpoints
  getUserRepos: () => gatewayFetch('/user-repos'),
  bulkUpsertRepos: (repos: unknown) =>
    gatewayFetch('/user-repos/bulk', { method: 'PUT', body: JSON.stringify(repos) }),
  addCustomRepo: (repo: unknown) =>
    gatewayFetch('/user-repos', { method: 'POST', body: JSON.stringify(repo) }),
  deleteRepo: (owner: string, name: string) =>
    gatewayFetch(`/user-repos/${owner}/${name}`, { method: 'DELETE' }),

  // Repo / PR endpoints
  getPRs: (owner: string, repo: string) => gatewayFetch(`/repos/${owner}/${repo}/prs`),
  bulkUpsertPRs: (owner: string, repo: string, prs: unknown) =>
    gatewayFetch(`/repos/${owner}/${repo}/prs/bulk`, { method: 'PUT', body: JSON.stringify(prs) }),
  getPRReviews: (owner: string, repo: string, prNumber: number) =>
    gatewayFetch(`/repos/${owner}/${repo}/prs/${prNumber}/reviews`),
};
