import React from "react";

/**
 * Props
 * - page            : 현재 페이지(1-based)
 * - totalPages      : 전체 페이지
 * - size            : 페이지 크기
 * - onPageChange    : (nextPage:number) => void
 * - onSizeChange    : (nextSize:number) => void
 * - totalElements   : 전체 개수(좌측 요약 표시에 사용, 옵션)
 * - unitLabel       : 좌측 요약 단위 텍스트 (예: "개 결과", "개 시나리오") - 옵션
 * - pageSizeOptions : [10, 20, 50] 등 셀렉트 옵션 - 옵션
 * - className       : 외부 wrapper 클래스 - 옵션
 */

export default function PaginationBar({
  page = 1,
  totalPages = 1,
  size = 10,
  onPageChange,
  onSizeChange,
  totalElements,
  unitLabel = "개 결과",
  pageSizeOptions = [10, 20, 50],
  className = "",
}) {
  const canPrev = page > 1;
  const canNext = page < Math.max(1, totalPages);

  return (
    <div className={`flex items-center justify-between px-2 text-sm ${className}`}>
      {/* 좌측 요약 */}
      <div className="text-gray-600 dark:text-gray-400">
        {typeof totalElements === "number" ? (
          <>총 <span className="font-semibold text-gray-900 dark:text-gray-100">{totalElements}</span>{unitLabel}</>
        ) : <span>&nbsp;</span>}
      </div>

      {/* 우측 컨트롤 */}
      <div className="flex items-center gap-1.5">
        <button
          disabled={!canPrev}
          onClick={() => canPrev && onPageChange?.(page - 1)}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          aria-label="이전 페이지"
        >
          <span className="material-symbols-outlined text-base">chevron_left</span>
          이전
        </button>

        <div className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
          {page} / {Math.max(1, totalPages)}
        </div>

        <button
          disabled={!canNext}
          onClick={() => canNext && onPageChange?.(page + 1)}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          aria-label="다음 페이지"
        >
          다음
          <span className="material-symbols-outlined text-base">chevron_right</span>
        </button>

        <label className="ml-2 inline-flex items-center gap-1" title="페이지 크기">
          <select
            value={size}
            onChange={(e) => onSizeChange?.(Number(e.target.value))}
            className="h-8 px-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 text-sm"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{n}개씩</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
