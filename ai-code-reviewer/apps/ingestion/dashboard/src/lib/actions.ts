'use server';

import { revalidatePath } from 'next/cache';
import { auth, signOut } from './auth';
import { apiClient } from './api';
import { checkRepoAccess, deltaSyncPRs, getOpenPRs, getPR, getPRFiles, getUserRepos } from './github';
import type { PullRequest } from '@/types';

export async function signOutAction() {
  const session = await auth();
  if (session?.githubToken) {
    await revokeGithubToken(session.githubToken);
  }
  await signOut({ redirectTo: '/login' });
}

async function revokeGithubToken(token: string) {
  const clientId = process.env.GITHUB_CLIENT_ID!;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  await fetch(`https://api.github.com/applications/${clientId}/token`, {
    method: 'DELETE',
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ access_token: token }),
  }).catch(() => {});
}

export async function syncRepos() {
  const session = await auth();
  if (!session?.githubToken) throw new Error('Not authenticated');

  const ghRepos = await getUserRepos(session.githubToken);
  const repos = ghRepos
    .filter((r) => r.permissions?.pull === true)
    .map((r) => ({
      owner: r.owner.login,
      name: r.name,
      fullName: r.full_name,
      isOwned: r.owner.login === session.user.login,
    }));

  const res = await apiClient.bulkUpsertRepos(repos);
  if (!res.ok) throw new Error('Failed to save repos');
  revalidatePath('/home');
}

export async function syncPRs(owner: string, repo: string) {
  const session = await auth();
  if (!session?.githubToken) throw new Error('Not authenticated');

  const ghPRs = await getOpenPRs(session.githubToken, owner, repo);
  const prs = ghPRs.map((pr) => ({
    prNumber: pr.number,
    title: pr.title,
    author: pr.user.login,
    state: pr.state,
    commitSha: pr.head.sha,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
  }));

  const res = await apiClient.bulkUpsertPRs(owner, repo, prs);
  if (!res.ok) throw new Error('Failed to save PRs');
  revalidatePath(`/repos/${owner}/${repo}/prs`);
}

export async function runDeltaSyncPRs(
  owner: string,
  repo: string,
  since: string,
  isOwned: boolean,
) {
  const session = await auth();
  if (!session?.githubToken) throw new Error('Not authenticated');

  // Fetch currently-cached PR numbers so we know which search results are new
  const cachedRes = await apiClient.getPRs(owner, repo);
  const cachedPRs: PullRequest[] = cachedRes.ok ? await cachedRes.json() : [];
  const cachedNumbers = new Set(cachedPRs.map((p) => p.prNumber));

  const searchResults = await deltaSyncPRs(
    session.githubToken,
    owner,
    repo,
    new Date(since),
    session.user.login,
    isOwned,
  );

  // Existing PRs: metadata update only (no sha — keep whatever is in the DB)
  const existingItems = searchResults
    .filter((pr) => cachedNumbers.has(pr.number))
    .map((pr) => ({
      prNumber: pr.number,
      title: pr.title,
      author: pr.user.login,
      state: pr.state,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
    }));

  // New PRs: follow-up fetch to get head.sha
  const newSearchItems = searchResults.filter((pr) => !cachedNumbers.has(pr.number));
  const fullNewPRs = await Promise.all(
    newSearchItems.map((pr) => getPR(session.githubToken!, owner, repo, pr.number)),
  );
  const newItems = fullNewPRs
    .filter((pr): pr is NonNullable<typeof pr> => pr !== null)
    .map((pr) => ({
      prNumber: pr.number,
      title: pr.title,
      author: pr.user.login,
      state: pr.state,
      commitSha: pr.head.sha,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
    }));

  const allItems = [...existingItems, ...newItems];
  if (allItems.length > 0) {
    const res = await apiClient.bulkUpsertPRs(owner, repo, allItems);
    if (!res.ok) throw new Error('Failed to save PRs');
  } else {
    // Still update lastPrPollAt even if no PRs changed — send empty bulk upsert
    await apiClient.bulkUpsertPRs(owner, repo, []);
  }

  revalidatePath(`/repos/${owner}/${repo}/prs`);
}

export async function addCustomRepo(
  fullName: string,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.githubToken) return { error: 'Not authenticated' };

  const parts = fullName.trim().split('/').filter((p) => p.length > 0);
  if (parts.length !== 2) return { error: 'Invalid format. Use owner/repo.' };
  const [owner, name] = parts;

  const access = await checkRepoAccess(session.githubToken, owner, name);
  if (!access.accessible) return { error: 'Cannot access this repository.' };
  if (!access.canReadPRs) return { error: "You don't have PR read access to this repository." };

  const res = await apiClient.addCustomRepo({ owner, name, fullName: `${owner}/${name}`, isOwned: owner === session.user.login });
  if (!res.ok) return { error: 'Failed to add repository.' };
  revalidatePath('/home');
  return { success: true };
}

export async function deleteRepo(
  owner: string,
  name: string,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.githubToken) return { error: 'Not authenticated' };

  const res = await apiClient.deleteRepo(owner, name);
  if (!res.ok) return { error: 'Failed to remove repository.' };
  revalidatePath('/home');
  return { success: true };
}

export async function requestReview(
  owner: string,
  repo: string,
  prNumber: number,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.githubToken) return { error: 'Not authenticated' };

  const [pr, changedFiles] = await Promise.all([
    getPR(session.githubToken, owner, repo, prNumber),
    getPRFiles(session.githubToken, owner, repo, prNumber),
  ]);

  if (!pr) return { error: 'Could not fetch PR details from GitHub.' };

  const res = await apiClient.analyze({
    pr_id: prNumber,
    repo_id: `${owner}/${repo}`,
    org_id: owner,
    commit_sha: pr.head.sha,
    changed_files: changedFiles,
    action: 'opened',
    provider: 'github',
  });

  if (!res.ok) return { error: `Failed to queue review (HTTP ${res.status}).` };
  revalidatePath(`/repos/${owner}/${repo}/prs/${prNumber}`);
  return { success: true };
}
