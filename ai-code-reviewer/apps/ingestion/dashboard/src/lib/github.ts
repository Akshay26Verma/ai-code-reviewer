import type { GithubPR, GithubRepo } from '@/types';

const GH_API = 'https://api.github.com';

function ghFetch(token: string, path: string, init?: RequestInit) {
  return fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...init?.headers,
    },
    next: { revalidate: 0 },
  });
}

export async function getUserRepos(token: string): Promise<GithubRepo[]> {
  const res = await ghFetch(
    token,
    '/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member',
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub /user/repos failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function getOpenPRs(token: string, owner: string, repo: string): Promise<GithubPR[]> {
  const res = await ghFetch(token, `/repos/${owner}/${repo}/pulls?state=open&per_page=100`);
  if (!res.ok) return [];
  return res.json();
}

export async function checkRepoAccess(
  token: string,
  owner: string,
  repo: string,
): Promise<{ accessible: boolean; canReadPRs: boolean }> {
  const res = await ghFetch(token, `/repos/${owner}/${repo}`);
  if (!res.ok) return { accessible: false, canReadPRs: false };
  const data: GithubRepo = await res.json();
  return {
    accessible: true,
    canReadPRs: data.permissions?.pull === true,
  };
}

export async function getPRFiles(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<string[]> {
  const res = await ghFetch(token, `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`);
  if (!res.ok) return [];
  const files: { filename: string }[] = await res.json();
  return files.map((f) => f.filename);
}

export interface SearchPR {
  number: number;
  title: string;
  user: { login: string };
  state: string;
  created_at: string;
  updated_at: string;
}

export async function deltaSyncPRs(
  token: string,
  owner: string,
  repo: string,
  since: Date,
  userLogin: string,
  isOwned: boolean,
): Promise<SearchPR[]> {
  const sinceStr = since.toISOString().replace(/\.\d{3}Z$/, 'Z');
  let q = `repo:${owner}/${repo}+is:pr+is:open+updated:>${sinceStr}`;
  if (!isOwned) {
    q += `+(author:${userLogin} OR assignee:${userLogin} OR mentions:${userLogin})`;
  }
  const res = await ghFetch(token, `/search/issues?q=${q}&sort=updated&per_page=100`);
  if (!res.ok) return [];
  const data: { items: SearchPR[] } = await res.json();
  return data.items ?? [];
}

export async function getPR(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<GithubPR | null> {
  const res = await ghFetch(token, `/repos/${owner}/${repo}/pulls/${prNumber}`);
  if (!res.ok) return null;
  return res.json();
}
