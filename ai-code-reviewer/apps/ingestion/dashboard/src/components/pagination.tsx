'use client';

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  pageSizeOptions: number[];
  onPageSizeChange: (size: number) => void;
  totalItems: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  totalItems,
}: Props) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-gray-500">
      <span className="text-xs">
        {totalItems === 0 ? 'No results' : `Showing ${start}–${end} of ${totalItems}`}
      </span>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-400">Per page</label>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <PageButton onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
              ‹
            </PageButton>

            {pages.map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-gray-400">
                  …
                </span>
              ) : (
                <PageButton
                  key={p}
                  onClick={() => onPageChange(p)}
                  active={p === currentPage}
                >
                  {p}
                </PageButton>
              ),
            )}

            <PageButton onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
              ›
            </PageButton>
          </div>
        )}
      </div>
    </div>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[28px] rounded-md px-2 py-1 text-xs transition-colors disabled:opacity-40 disabled:cursor-default ${
        active
          ? 'bg-gray-900 text-white'
          : 'border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:hover:bg-transparent'
      }`}
    >
      {children}
    </button>
  );
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');

  pages.push(total);
  return pages;
}
