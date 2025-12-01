// src/features/testresult/components/TestCaseResultTable.jsx
import React from "react";
import ResultBadge from "./ResultBadge";
import { formatMs } from "../../../shared/utils/timeUtils";
import { parseEvidenceList, toEvidenceUrl } from "../utils/evidenceUtils";

/**
 * 한 Run에 대한 테스트케이스 결과 테이블
 */
export default function TestCaseResultTable({
                                              runId,
                                              block,
                                              testName,
                                              deviceName,
                                              udid,
                                              onOpenEvidence,
                                              onClickCreateJira,
                                            }) {
  const { loading, error, rows = [] } = block || {};

  return (
    <div className="col-span-12">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
          테스트 케이스 결과
        </div>
        {loading && (
          <span className="text-[11px] text-gray-500">불러오는 중…</span>
        )}
      </div>

      {error && (
        <div className="text-xs text-rose-600 dark:text-rose-300">{error}</div>
      )}

      {!loading && !error && (
        <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-900 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
            <div className="col-span-2">케이스 ID</div>
            <div className="col-span-5">케이스명</div>
            <div className="col-span-2">실행시간(ms)</div>
            <div className="col-span-1 text-center">결과</div>
            <div className="col-span-1 text-center">증거</div>
            <div className="col-span-1 text-center">이슈</div>
          </div>

          {/* rows */}
          {rows.length === 0 ? (
            <div className="px-3 py-6 text-[12px] text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">
              결과가 없습니다
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {rows.map((tc, i) => {
                const caseId = tc?.testCaseId ?? tc?.id ?? `#${i + 1}`;
                const caseCode = tc?.testCaseCode ?? tc?.code ?? "-";
                const caseName = tc?.testCaseName ?? tc?.name ?? "-";
                const durMs = tc?.durationMs ?? "-";
                const result = tc?.runResult ?? tc?.result ?? "N/A";
                const issueId =
                  tc?.issueId ?? tc?.issue ?? tc?.jiraIssueKey ?? null;
                const evidenceStr =
                  tc?.errorEvidence ?? tc?.error_evidence ?? null;

                return (
                  <div
                    key={`${caseId}-${i}`}
                    className="grid grid-cols-12 gap-2 px-3 py-2 text-[12px]"
                  >
                    <div
                      className="col-span-2 text-gray-800 dark:text-gray-200"
                      title={caseCode}
                    >
                      {caseCode}
                    </div>
                    <div
                      className="col-span-5 text-gray-700 dark:text-gray-300 truncate"
                      title={caseName}
                    >
                      {caseName}
                    </div>
                    <div className="col-span-2 text-gray-700 dark:text-gray-300">
                      {formatMs(durMs)}
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <ResultBadge result={result} />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      {evidenceStr ? (
                        <button
                          type="button"
                          onClick={() => {
                            const imgs = parseEvidenceList(evidenceStr)
                              .map(toEvidenceUrl)
                              .filter(Boolean);
                            onOpenEvidence(imgs);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="증거 보기"
                        >
                          <span className="material-symbols-outlined text-base leading-none">
                            image
                          </span>
                          <span className="hidden sm:inline">보기</span>
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      {issueId ? (
                        <a
                          href={`https://skt-test-automation-temp.atlassian.net/browse/${issueId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-300 hover:underline"
                        >
                          {issueId}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            onClickCreateJira(
                              runId,
                              tc,
                              caseCode,
                              caseName,
                              testName,
                              deviceName,
                              udid
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-amber-700 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200"
                          title="JIRA 이슈 생성"
                        >
                          <span className="material-symbols-outlined text-base leading-none">
                            add
                          </span>
                          <span className="hidden sm:inline">생성</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}