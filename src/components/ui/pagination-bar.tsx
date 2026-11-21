"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

interface PaginationBarProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange?: (page: number) => void;
}

export function PaginationBar({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1 && totalItems === 0) return null;

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  function createPageUrl(pageNumber: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  }

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  const renderPageButton = (p: number | string, idx: number) => {
    if (typeof p === "string") {
      return (
        <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-[#64748B]">
          …
        </span>
      );
    }

    const isActive = p === currentPage;

    if (onPageChange) {
      return (
        <button
          key={`page-${p}`}
          type="button"
          onClick={() => onPageChange(p)}
          className={`min-w-8 h-8 px-2 text-xs rounded transition-colors ${
            isActive
              ? "bg-[#23513C] text-white font-semibold"
              : "text-[#0F172A] hover:bg-[#F1F5F9]"
          }`}
        >
          {p}
        </button>
      );
    }

    return (
      <Link
        key={`page-${p}`}
        href={createPageUrl(p)}
        prefetch={false}
        className={`min-w-8 h-8 px-2 flex items-center justify-center text-xs rounded transition-colors ${
          isActive
            ? "bg-[#23513C] text-white font-semibold"
            : "text-[#0F172A] hover:bg-[#F1F5F9]"
        }`}
      >
        {p}
      </Link>
    );
  };

  const renderPrev = () => {
    const disabled = currentPage <= 1;
    if (disabled) {
      return (
        <span className="px-2.5 py-1 text-xs text-[#94A3B8] cursor-not-allowed select-none">
          Previous
        </span>
      );
    }
    if (onPageChange) {
      return (
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          className="px-2.5 py-1 text-xs text-[#0F172A] hover:text-[#23513C] hover:underline"
        >
          Previous
        </button>
      );
    }
    return (
      <Link
        href={createPageUrl(currentPage - 1)}
        prefetch={false}
        className="px-2.5 py-1 text-xs text-[#0F172A] hover:text-[#23513C] hover:underline"
      >
        Previous
      </Link>
    );
  };

  const renderNext = () => {
    const disabled = currentPage >= totalPages;
    if (disabled) {
      return (
        <span className="px-2.5 py-1 text-xs text-[#94A3B8] cursor-not-allowed select-none">
          Next
        </span>
      );
    }
    if (onPageChange) {
      return (
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          className="px-2.5 py-1 text-xs text-[#0F172A] hover:text-[#23513C] hover:underline"
        >
          Next
        </button>
      );
    }
    return (
      <Link
        href={createPageUrl(currentPage + 1)}
        prefetch={false}
        className="px-2.5 py-1 text-xs text-[#0F172A] hover:text-[#23513C] hover:underline"
      >
        Next
      </Link>
    );
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E2E8F0]">
      <div className="text-xs text-[#64748B]">
        Showing {startItem}-{endItem} of {totalItems}
      </div>
      <div className="flex items-center gap-1">
        {renderPrev()}
        <div className="flex items-center gap-1 mx-1">
          {pages.map((p, idx) => renderPageButton(p, idx))}
        </div>
        {renderNext()}
      </div>
    </div>
  );
}
