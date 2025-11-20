
export default function JiraIssueModal({
                          open, loading,
                          summary, description, labels, priority, includeArtifacts,
                          summaryMax, trimSummary,
                          onChange, onClose, onSubmit, onReset,
                        }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-[96vw] max-w-4xl max-h-[88vh] overflow-hidden"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !loading) { e.preventDefault(); onSubmit(); }
          if (e.key === "Escape") { e.preventDefault(); onClose(); }
        }}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 px-5 py-3.5 bg-white/90 dark:bg-gray-900/85 backdrop-blur border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">bug_report</span>
            </div>
            <div>
              <div className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">JIRA 이슈 등록</div>
              <div className="text-[12px] text-gray-500 dark:text-gray-400">Ctrl/Cmd + Enter: 생성 · ESC: 닫기</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={onReset}
              title="기본 내용으로 되돌리기"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              되돌리기
            </button>
            <button
              className="inline-flex items-center px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              onClick={onClose}
              title="닫기"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        {/* Body: form + preview */}
        <div className="grid grid-cols-12 gap-0 md:gap-4 p-4 md:p-5 overflow-y-auto max-h-[calc(88vh-52px)]">
          {/* Form column */}
          <div className="col-span-12 md:col-span-7 flex flex-col gap-3">
            {/* Summary */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[12px] text-gray-600 dark:text-gray-400">요약 (Summary)</label>
                <div className={`text-[11px] ${ (summary?.length||0) > summaryMax ? 'text-rose-600 dark:text-rose-300' : 'text-gray-500 dark:text-gray-400' }`}>
                  {(summary?.length||0)}/{summaryMax}
                </div>
              </div>
              <input
                value={summary}
                onChange={(e)=>onChange("summary", e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="[YYYY/MM/DD] 테스트 실패 결과 보고"
              />
              {(summary?.length||0) > summaryMax && (
                <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-300">요약은 {summaryMax}자 이하여야 합니다. 생성 시 자동으로 잘립니다.</div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-[12px] text-gray-600 dark:text-gray-400">설명 (Description)</label>
              <textarea
                value={description}
                onChange={(e)=>onChange("description", e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm min-h-[160px] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="실패 원인/컨텍스트를 적어주세요"
              />
              <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">템플릿에 실행/케이스/결과/로그가 포함됩니다. 필요시 내용을 편집하세요.</div>
            </div>

            {/* Labels & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] text-gray-600 dark:text-gray-400">라벨 (comma)</label>
                <input
                  value={labels}
                  onChange={(e)=>onChange("labels", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="qaone,automation"
                />
                <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">쉼표로 구분하여 여러 개 입력할 수 있습니다.</div>
              </div>
              <div>
                <label className="text-[12px] text-gray-600 dark:text-gray-400">Priority</label>
                <select
                  value={priority}
                  onChange={(e)=>onChange("priority", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option>Blocker</option>
                  <option>Critical</option>
                  <option>Major</option>
                  <option>Minor</option>
                  <option>Trivial</option>
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 mt-1.5 text-sm select-none">
              <input type="checkbox" checked={!!includeArtifacts} onChange={(e)=>onChange("includeArtifacts", e.target.checked)} />
              스크린샷 첨부
            </label>
          </div>

          {/* Preview column */}
          <div className="col-span-12 md:col-span-5">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 h-full p-3">
              <div className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-2">미리보기</div>
              <div className="space-y-2 overflow-auto max-h-[60vh]">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{trimSummary(summary || "")}</div>
                <pre className="text-[12px] whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">{description || "-"}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 px-5 py-3 bg-white/90 dark:bg-gray-900/85 backdrop-blur border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
          <button
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm"
            onClick={onClose}
            disabled={loading}
          >취소</button>
          <button
            className="px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60 inline-flex items-center gap-2"
            onClick={onSubmit}
            disabled={loading || !summary}
            title="Ctrl/Cmd + Enter"
          >
            {loading && (
              <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/70 border-t-transparent animate-spin"></span>
            )}
            {loading ? '생성 중…' : '생성'}
          </button>
        </div>
      </div>
    </div>
  );
}
