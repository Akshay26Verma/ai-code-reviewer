'use client';

import { useEffect } from 'react';

interface Account {
  login: string;
  name: string | null;
  image: string | null;
}

const COOKIE = 'known_gh_accounts';
const MAX_ACCOUNTS = 5;

export function AccountTracker({ login, name, image }: Account) {
  useEffect(() => {
    const existing = readAccounts();
    const filtered = existing.filter((a) => a.login !== login);
    const updated = [{ login, name, image }, ...filtered].slice(0, MAX_ACCOUNTS);
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(updated))};path=/;expires=${expires}`;
  }, [login, name, image]);

  return null;
}

function readAccounts(): Account[] {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE}=`));
  if (!match) return [];
  try {
    return JSON.parse(decodeURIComponent(match.slice(COOKIE.length + 1)));
  } catch {
    return [];
  }
}
