'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavSidebarProps {
  userLogin: string;
  onSignOut: () => Promise<void>;
}

const navLinks = [
  { href: '/prs', label: 'Pull Requests' },
  { href: '/insights/developer', label: 'Dev Insights' },
  { href: '/insights/team', label: 'Team Insights' },
];

export function NavSidebar({ userLogin, onSignOut }: NavSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white px-4 py-6">
      <div className="mb-8">
        <span className="text-sm font-semibold text-gray-900">AI Code Reviewer</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith(href)
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-gray-200 pt-4">
        <p className="mb-2 truncate text-xs text-gray-500">@{userLogin}</p>
        <form action={onSignOut}>
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
