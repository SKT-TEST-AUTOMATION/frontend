import React from "react";

const DownloadIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const RefreshIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

/**
 * @param {{
 *  testCaseId?: number|string;
 *  excelFileName?: string;
 *  isReadOnly: boolean;
 *  hasMeta: boolean;
 *  onRefresh: () => void;
 *  onDownload: () => void;
 *  onReset?: () => void;
 * }} props
 */
export default function ExcelFilePanel({
                                         testCaseId,
                                         excelFileName,
                                         isReadOnly,
                                         hasMeta,
                                         onRefresh,
                                         onDownload,
                                         onReset,
                                       }) {
  if (!testCaseId) return null;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          현재 저장된 파일
        </span>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {excelFileName ? (
            excelFileName
          ) : (
            <span className="text-slate-400 italic">파일 없음</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition shadow-sm"
        >
          <RefreshIcon className="w-3.5 h-3.5" /> 불러오기
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition shadow-sm"
        >
          <DownloadIcon className="w-3.5 h-3.5" /> 다운로드
        </button>
        {!isReadOnly && hasMeta && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition shadow-sm ml-2"
          >
            초기화
          </button>
        )}
      </div>
    </div>
  );
}