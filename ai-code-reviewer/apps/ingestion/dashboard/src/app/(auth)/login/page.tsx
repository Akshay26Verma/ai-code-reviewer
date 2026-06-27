import { cookies } from 'next/headers';
import { signIn } from '@/lib/auth';

interface KnownAccount {
  login: string;
  name: string | null;
  image: string | null;
}

function readKnownAccounts(): KnownAccount[] {
  const raw = cookies().get('known_gh_accounts')?.value;
  if (!raw) return [];
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return [];
  }
}

export default function LoginPage() {
  const accounts = readKnownAccounts();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">AI Code Reviewer</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to review pull requests and insights.
          </p>
        </div>

        <div className="space-y-2">
          {accounts.map((account) => (
            <form
              key={account.login}
              action={async () => {
                'use server';
                await signIn('github', { redirectTo: '/home' }, { login: account.login });
              }}
            >
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:bg-gray-50"
              >
                {account.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={account.image} alt="" className="h-8 w-8 shrink-0 rounded-full" />
                ) : (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200" />
                )}
                <div className="min-w-0">
                  {account.name && (
                    <p className="truncate text-sm font-medium text-gray-900">{account.name}</p>
                  )}
                  <p className="truncate text-xs text-gray-500">@{account.login}</p>
                </div>
              </button>
            </form>
          ))}

          {accounts.length > 0 && (
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-400">or</span>
              </div>
            </div>
          )}

          <form
            action={async () => {
              'use server';
              await signIn('github', { redirectTo: '/home' });
            }}
          >
            <button
              type="submit"
              className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                accounts.length > 0
                  ? 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300'
                  : 'bg-gray-900 text-white hover:bg-gray-700 focus:ring-gray-900'
              }`}
            >
              <GitHubIcon />
              {accounts.length > 0 ? 'Use a different account' : 'Sign in with GitHub'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.1.82-.26.82-.58 0-.28-.01-1.03-.02-2.02-3.34.73-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.005 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.93.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.69.82.57C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
