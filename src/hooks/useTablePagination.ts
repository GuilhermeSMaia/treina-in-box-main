import { useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 10;

export function useTablePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset to page 1 when items change significantly
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safeCurrentPage, pageSize]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return {
    paginatedItems,
    currentPage: safeCurrentPage,
    totalPages,
    totalItems: items.length,
    goToPage,
    nextPage: () => goToPage(safeCurrentPage + 1),
    prevPage: () => goToPage(safeCurrentPage - 1),
    hasNextPage: safeCurrentPage < totalPages,
    hasPrevPage: safeCurrentPage > 1,
    resetPage: () => setCurrentPage(1),
  };
}
