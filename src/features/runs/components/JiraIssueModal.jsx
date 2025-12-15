import React, { useEffect, useRef, useMemo, useCallback } from "react";

// --- Icons (Inline SVG) ---
const IconBug = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15m12.803-3.197l-2.122 2.122m-8.485 8.485l-2.122 2.122m2.122-12.728l2.122 2.122m8.485 8.485l2.122 2.122"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 9.75a3 3 0 114.5 0 3 3 0 01-4.5 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18.364 5.636l-1.414 1.414M7.05 7.05L5.636 5.636m12.728 12.728l-1.414-1.414m-9.9 0l-1.414 1.414M12 3v3m0 12v3m9-9h-3M6 12H3"
    />
  </svg>
);

const IconClose = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconRefresh = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const IconImage = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
    />
  </svg>
);

// ---------------------------------------------------------------------
// JiraIssueModal
// 기존 props 시그니처 그대로 유지
// ---------------------------------------------------------------------
export default function JiraIssueModal({
                                         open,
                                         loading,
                                         summary,
                                         description,
                                         labels,
                                         priority,
                                         includeArtifacts,
                                         summaryMax,
                                         trimSummary,
                                         onChange,
                                         onClose,
                                         onSubmit,
                                         onReset,
                                       }) {
  const summaryInputRef = useRef(null);

  const max = summaryMax ?? 100;

  const safeTrimSummary = useCallback(
    (text) =>
      typeof trimSummary === "function"
        ? trimSummary(text)
        : text ?? "",
    [trimSummary]
  );

  const summaryLength = useMemo(
    () => (summary?.length ?? 0),
    [summary]
  );

  const isSummaryError = useMemo(
    () => summaryLength > max,
    [summaryLength, max]
  );

  const labelList = useMemo(
    () =>
      (labels || "")
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean),
    [labels]
  );

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      summaryInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    // ⚠️ 여기: 전체 화면 래퍼에 overflow-y-auto 추가 + items-start 로 위쪽 정렬
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 sm:p-6 text-left overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 모달 컨테이너 - max-h 로만 제한, 내부에서 스크롤 */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !loading && summary) {
            e.preventDefault();
            onSubmit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
      >
        {/* Header (고정 높이) */}
        <header className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
              <IconBug className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                JIRA 이슈 등록
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <span className="hidden sm:inline">테스트 실패 결과를 바로 JIRA에 등록합니다.</span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                <span className="hidden sm:inline text-gray-400">
                  <kbd className="inline-flex items-center gap-1 font-sans px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[10px] text-gray-500">
                    Ctrl / ⌘ + Enter
                  </kbd>{" "}
                  로 생성, ESC로 닫기
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-xs font-medium flex items-center gap-1.5"
              title="기본 내용으로 되돌리기"
            >
              <IconRefresh className="w-4 h-4" />
              <span className="hidden sm:inline">되돌리기</span>
            </button>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="닫기 (Esc)"
            >
              <IconClose className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Body - 여기에서 전체 내용 스크롤 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="h-full grid grid-cols-1 lg:grid-cols-2">
            {/* Left: Form */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      요약 (Summary) <span className="text-red-500">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-medium ${
                        isSummaryError ? "text-red-600" : "text-gray-400"
                      }`}
                    >
                      {summaryLength}/{max}
                    </span>
                  </div>
                  <input
                    ref={summaryInputRef}
                    type="text"
                    value={summary}
                    onChange={(e) => onChange("summary", e.target.value)}
                    placeholder="[YYYY/MM/DD] 테스트 실패 결과 보고"
                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border rounded-lg text-sm transition-all outline-none focus:ring-2 focus:bg-white dark:focus:bg-gray-800 ${
                      isSummaryError
                        ? "border-red-300 focus:ring-red-200 focus:border-red-500"
                        : "border-gray-200 dark:border-gray-700 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900/30"
                    }`}
                  />
                  {isSummaryError && (
                    <p className="text-xs text-red-600">
                      요약은 {max}자 이하여야 합니다. 생성 시 자동으로 잘립니다.
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2 flex-1 flex flex-col">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    설명 (Description)
                  </label>
                  <div className="relative">
                    <textarea
                      value={description}
                      onChange={(e) => onChange("description", e.target.value)}
                      placeholder="실패 원인, 재현 단계, 기대 결과 등을 자세히 적어주세요."
                      className="w-full h-48 sm:h-64 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900/30 focus:bg-white dark:focus:bg-gray-800 resize-none font-mono leading-relaxed"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    템플릿에 실행/케이스/결과가 자동 포함됩니다. 필요 시 내용을 편집하세요.
                  </p>
                </div>

                {/* Priority & Labels */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Priority
                    </label>
                    <div className="relative">
                      <select
                        value={priority}
                        onChange={(e) => onChange("priority", e.target.value)}
                        className="w-full appearance-none px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900/30"
                      >
                        <option value="Blocker">Blocker</option>
                        <option value="Critical">Critical</option>
                        <option value="Major">Major</option>
                        <option value="Minor">Minor</option>
                        <option value="Trivial">Trivial</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      라벨 (Labels, comma)
                    </label>
                    <input
                      type="text"
                      value={labels}
                      onChange={(e) => onChange("labels", e.target.value)}
                      placeholder="qaone,automation"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 dark:focus:ring-blue-900/30"
                    />
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      쉼표(,)로 구분하여 여러 개 입력할 수 있습니다.
                    </p>
                  </div>
                </div>

                {/* Attachments */}
                <div className="pt-2">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      includeArtifacts
                        ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                        : "bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!includeArtifacts}
                      onChange={(e) =>
                        onChange("includeArtifacts", e.target.checked)
                      }
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <IconImage className="w-4 h-4 text-gray-500" />
                        스크린샷 첨부
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        실행 시점의 스크린샷을 자동으로 이슈에 첨부합니다.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Preview (lg 이상에서만 표시) */}
            <div className="hidden lg:flex flex-col border-l border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  미리보기
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-medium">
                  JIRA PREVIEW
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                  {/* Preview Header */}
                  <div className="space-y-4 pb-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 flex-none">
                        <IconBug className="w-5 h-5 text-red-500" />
                      </span>
                      <h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight break-words">
                        {summary ? (
                          safeTrimSummary(summary || "")
                        ) : (
                          <span className="text-gray-300 italic">
                            요약이 입력되지 않았습니다.
                          </span>
                        )}
                      </h1>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-8">
                      {priority && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {priority}
                        </span>
                      )}
                      {labelList.map((label, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          {label}
                        </span>
                      ))}
                      {includeArtifacts && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 gap-1">
                          <IconImage className="w-3 h-3" />
                          Artifacts
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preview Body */}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300 font-mono">
                      {description ? (
                        description
                      ) : (
                        <span className="text-gray-300 italic">
                          설명이 입력되지 않았습니다...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer (고정) */}
        <footer className="flex-none px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between sm:justify-end gap-3 z-10">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-200 dark:focus:ring-gray-700 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onSubmit}
            disabled={loading || !summary || isSummaryError}
            title="Ctrl / ⌘ + Enter"
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4 text-white animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042
                       1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                이슈 생성 중...
              </>
            ) : (
              "생성"
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
