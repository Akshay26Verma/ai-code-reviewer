import type { ReviewComment } from '@/types';

const SEVERITY_STYLES: Record<string, string> = {
  error: 'border-red-300 bg-red-50 text-red-800',
  warning: 'border-amber-300 bg-amber-50 text-amber-800',
  info: 'border-blue-300 bg-blue-50 text-blue-800',
};

const SEVERITY_BADGE: Record<string, string> = {
  error: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-blue-100 text-blue-700',
};

export function DiffComment({ comment }: { comment: ReviewComment }) {
  const style = SEVERITY_STYLES[comment.severity] ?? SEVERITY_STYLES['info'];
  const badge = SEVERITY_BADGE[comment.severity] ?? SEVERITY_BADGE['info'];

  return (
    <div className={`rounded-md border p-3 text-sm ${style}`}>
      <div className="mb-1 flex items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${badge}`}>
          {comment.severity}
        </span>
        <span className="font-mono text-xs opacity-75">
          {comment.file}:{comment.line}
        </span>
      </div>
      <p>{comment.body}</p>
    </div>
  );
}
