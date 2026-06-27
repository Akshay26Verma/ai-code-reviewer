'use client';

interface Props {
  variant?: 'card' | 'button';
}

export function IndexRepoButton({ variant = 'button' }: Props) {
  if (variant === 'card') {
    return (
      <button
        disabled
        title="Indexing coming soon (requires orchestration layer)"
        aria-label="Index repo — coming soon"
        className="rounded-md p-1 text-gray-300 cursor-not-allowed"
      >
        <LightningIcon />
      </button>
    );
  }

  return (
    <button
      disabled
      title="Indexing coming soon (requires orchestration layer)"
      className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-400 cursor-not-allowed"
    >
      Index Repo
    </button>
  );
}

function LightningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M9.586 1.526A.75.75 0 0 0 8.553 1h-4.5a.75.75 0 0 0-.723.947l1.5 5.5A.75.75 0 0 0 5.553 8H7.5L6.053 13.974a.75.75 0 0 0 1.332.554l6-7A.75.75 0 0 0 12.75 6.5H10.5l-.914-4.974Z" />
    </svg>
  );
}
