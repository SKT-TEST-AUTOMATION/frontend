import React from "react";
import ResultBadge from "./ResultBadge";
import { formatMs } from "../../../shared/utils/timeUtils";
import { parseEvidenceList, toEvidenceUrl } from "../utils/evidenceUtils";

// --- Icons ---

const IconImage = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-4 h-4"
  >
    <path
      fillRule="evenodd"
      d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z"
      clipRule="evenodd"
    />
  </svg>
);

const IconPlus = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-3.5 h-3.5"
  >
    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
  </svg>
);

const IconExternalLink = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-3.5 h-3.5"
  >
    <path
      fillRule="evenodd"
      d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
      clipRule="evenodd"
    />
    <path
      fillRule="evenodd"
      d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
      clipRule="evenodd"
    />
  </svg>
);

// --- Components ---

const TableHeaderCell = ({ children, className = "" }) => (
  <th
    scope="col"
    className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 ${className}`}
  >
    {children}
  </th>
);

const SkeletonRow = () => (
  <tr>
    <td className="px-4 py-4 whitespace-nowrap">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
    </td>
    <td className="px-4 py-4">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
    </td>
    <td className="px-4 py-4">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse mx-auto" />
    </td>
    <td className="px-4 py-4">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-16 animate-pulse mx-auto" />
    </td>
    <td className="px-4 py-4">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20 animate-pulse mx-auto" />
    </td>
    <td className="px-4 py-4">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse mx-auto" />
    </td>
    <td className="px-4 py-4">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse mx-auto" />
    </td>
  </tr>
);

/**
 * A refined table component for displaying test case results.
 */
export default function TestCaseResultTable({
                                              runId,
                                              block,
                                              testName,
                                              deviceName,
                                              udid,
                                              onOpenEvidence,
                                              onClickCreateJira,
                                              onClickFailCode,
                                            }) {
  const { loading, error, rows = [] } = block || {};

  return (
    <div className="col-span-12 w-full">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          테스트 케이스 결과
          {!loading && rows.length > 0 && (
            <span className="inline-flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-medium px-2 py-0.5 rounded-full">
              {rows.length}
            </span>
          )}
        </h3>
        {loading && (
          <span className="flex items-center text-xs text-gray-500 animate-pulse">
            <span className="w-2 h-2 mr-2 bg-blue-500 rounded-full" />
            데이터 불러오는 중...
          </span>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300 text-sm flex items-center gap-2">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
            <tr>
              <TableHeaderCell className="w-[10%] min-w-[100px]">
                케이스 ID
              </TableHeaderCell>
              <TableHeaderCell className="w-[30%]">케이스명</TableHeaderCell>
              <TableHeaderCell className="w-[10%] text-center">
                시간(ms)
              </TableHeaderCell>
              <TableHeaderCell className="w-[10%] text-center">
                결과
              </TableHeaderCell>
              <TableHeaderCell className="w-[15%] text-center">
                실패 코드
              </TableHeaderCell>
              <TableHeaderCell className="w-[10%] text-center">
                증거
              </TableHeaderCell>
              <TableHeaderCell className="w-[15%] text-center">
                이슈
              </TableHeaderCell>
            </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={`skeleton-${i}`} />
              ))
            ) : rows.length === 0 && !error ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                    <svg
                      className="w-10 h-10 mb-2 opacity-20"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01M9 16h.01"
                      />
                    </svg>
                    <span className="text-sm font-medium">
                        표시할 결과가 없습니다.
                      </span>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((tc, i) => {
                const caseId = tc?.testCaseId ?? tc?.id ?? `#${i + 1}`;
                const caseCode = tc?.testCaseCode ?? tc?.code ?? "-";
                const caseName = tc?.testCaseName ?? tc?.name ?? "-";
                const durMs = tc?.durationMs ?? "-";
                const result = tc?.runResult ?? tc?.result ?? "N/A";

                const issueId =
                  tc?.issueId ?? tc?.issue ?? tc?.jiraIssueKey ?? null;

                const evidenceStr =
                  tc?.errorEvidence ?? tc?.error_evidence ?? null;

                const failCodeStr = tc?.testFailCode?.code ?? null;
                const failComment = tc?.failComment ?? null;

                const isPass = result === "PASS";

                const handleFailCodeClick = () => {
                  if (!onClickFailCode) return;
                  onClickFailCode({
                    runId,
                    testCaseRow: tc,
                    caseId,
                    caseCode,
                    caseName,
                    testName,
                    deviceName,
                    udid,
                    failCode: failCodeStr,
                    failComment,
                  });
                };

                return (
                  <tr
                    key={`${caseId}-${i}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                  >
                    {/* Case Code */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div
                        className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate max-w-[120px]"
                        title={caseCode}
                      >
                        {caseCode}
                      </div>
                    </td>

                    {/* Case Name */}
                    <td className="px-4 py-3">
                      <div
                        className="text-xs font-medium text-gray-900 dark:text-gray-100 line-clamp-2"
                        title={caseName}
                      >
                        {caseName}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {formatMs(durMs)}
                      </div>
                    </td>

                    {/* Result */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex justify-center">
                        <ResultBadge result={result} />
                      </div>
                    </td>

                    {/* Fail Code */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex justify-center">
                        {isPass ? (
                          <span className="text-[10px] text-gray-300 dark:text-gray-600 select-none">
                              —
                            </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleFailCodeClick}
                            className={`
                                inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all duration-200
                                ${
                              failCodeStr
                                ? "text-pink-700 border border-pink-100 hover:bg-pink-100 hover:border-pink-100 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800"
                                : "text-gray-600 border border-dashed border-gray-300 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600"
                            }
                              `}
                            title={
                              failCodeStr
                                ? "실패 코드 수정"
                                : "실패 코드 할당 필요"
                            }
                          >
                            {failCodeStr || "코드 할당"}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Evidence */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {evidenceStr ? (
                        <button
                          type="button"
                          onClick={() => {
                            const imgs = parseEvidenceList(evidenceStr)
                              .map(toEvidenceUrl)
                              .filter(Boolean);
                            onOpenEvidence(imgs);
                          }}
                          className="inline-flex items-center justify-center p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                          title="증거 이미지 보기"
                        >
                          <IconImage /> <span className="text-xs ml-1">스크린샷</span>
                        </button>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">
                            -
                          </span>
                      )}
                    </td>

                    {/* Issue */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {issueId ? (
                        <a
                          href={`https://skt-test-automation-temp.atlassian.net/browse/${issueId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 hover:underline dark:bg-blue-900/20 dark:text-blue-300 transition-colors"
                        >
                          {issueId}
                          <IconExternalLink />
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 transition-all"
                          title="Jira 이슈 생성"
                        >
                          <IconPlus />
                          생성
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}