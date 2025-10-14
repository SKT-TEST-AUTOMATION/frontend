// src/features/results/pages/TestResultListPage.jsx
import { useCallback, useEffect, useState } from "react";
import { normalizePage, toErrorMessage } from "../../../services/axios";
import { Link } from "react-router-dom";
import PageHeader from "../../../shared/components/PageHeader";
import PaginationBar from "../../../shared/components/PaginationBar";
import { getScenarioTestResults } from "../../../services/scenarioAPI";
import fmtDT from "../../../shared/utils/dateUtils";
import { REQUEST_CANCELED_CODE } from "../../../constants/errors";

export default function TestResultListPage() {
  // -- 상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 페이지네이션 상태
  const [data, setData] = useState({
    content: [],
    totalElements: 0,
    totalPages: 1,
    number: 0, // Spring 0-based
    size: 10,
  });
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1); // 화면 1-based
  const [size, setSize] = useState(10);

  // 상세 토글(행 단위)
  const [expandedId, setExpandedId] = useState(null);

  // -- 결과/상태 배지
  const ResultBadge = ({ result }) => {
    const map = {
      PASS: { t: "PASS", c: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200" },
      FAIL: { t: "FAIL", c: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200" },
      "N/A": { t: "N/A", c: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
    };
    const m = map[result] || map["N/A"];
    return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${m.c}`}>{m.t}</span>;
  };

  const fetchResults = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getScenarioTestResults({ page: page - 1, size, sort: "id,desc" }, signal);
      const data = normalizePage(res);
      console.log(res);
      setData(data);
      setRows(data.content);
    } catch (err) {
      if (err?.code === REQUEST_CANCELED_CODE) return;
      const message = toErrorMessage(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, size]);

  useEffect(() => {
    const controller = new AbortController();
    fetchResults(controller.signal);
    return () => controller.abort();
  }, [fetchResults]);

  // -- 테이블 헤더
  const HEADERS = [
    {key: "id", label: "실행 ID", span: 1, align: "left"},
    {key: "test", label: "테스트 코드 / 명칭", span: 2},
    {key: "scenario", label: "시나리오 코드 / 명칭", span: 2},
    {key: "platform", label: "플랫폼 / 앱", span: 2},
    {key: "device", label: "디바이스(UDID)", span: 2},
    {key: "time", label: "시작 / 종료", span: 2},
    {key: "result", label: "결과", span: 1, align: "center"}
  ];

  return (
    <>
      <div className="flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-sm">
        {/* 헤더 */}
        <PageHeader
          title = "테스트 결과"
          subtitle = "시나리오 실행 결과를 확인하고 관리합니다."
          actions={
              <Link
                to="/issues/new"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 shadow hover:shadow-blue-500/20 text-sm"
              >
                <span className="material-symbols-outlined text-base leading-none">bug_report</span>
                이슈 등록
              </Link>
          }
        />
        {/* 컨텐츠 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* 테이블 헤더 */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3.5 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
            {HEADERS.map(({ key, label, span, align }) => (
              <div
                key={key}
                className={[
                  `col-span-${span}`,
                  "text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide",
                  align === null ? "" : `${align}`
                ].join(" ")}
              >
                {label}
              </div>
            ))}
            <div className="col-span-0 sm:col-span-0 md:hidden lg:hidden xl:hidden 2xl:hidden" />
          </div>

          {/* 로딩 */}
          {loading && (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-5 py-3.5">
                  {[1,2,2,2,2,2,1].map((span, idx) => (
                    <div key={idx} className={`col-span-${span}`}>
                      <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* 에러 */}
          {!loading && error && <div className="px-5 py-6 text-sm text-rose-600 dark:text-rose-300">{error}</div>}

          {/* 빈 상태 */}
          {!loading && !error && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-sm">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3.5">
                <span className="material-symbols-outlined text-gray-400 text-xl">list_alt</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">결과가 없습니다</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">페이지 크기를 변경해 보세요.</p>
            </div>
          )}

          {/* 목록 */}
          {!loading && !error && rows.length > 0 && (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((r) => {
                // r: ScenarioTestRunDto
                const id = r?.id;
                const st = r?.scenarioTest; // ScenarioTestDto
                const sc = st?.scenario;    // ScenarioDto

                const scenarioCode = sc?.code ?? "-";
                const scenarioName = sc?.name ?? "-";
                const testCode = st?.code ?? "-";
                const testName = st?.testName ?? "-";
                const platform = st?.appPlatformType ?? "-";
                const appName  = st?.testAppName ?? "-";
                const udid     = r?.deviceUdid ?? "-";
                const start    = r?.startTime;
                const end      = r?.endTime;
                const runResult = r?.runResult ?? "N/A";
                const errorMessage = r?.errorMessage;
                const resultLog = r?.resultLog;

                const expanded = expandedId === id;

                return (
                  <div key={id} className="group">
                    <div className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <div className="col-span-1 text-gray-900 dark:text-gray-100">{id}</div>

                    {/* 테스트 코드 / 이름 */}
                    <div className="col-span-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-800 dark:text-gray-200 font-medium truncate" title={testCode}>
                          {testCode}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 truncate" title={testName}>
                          {testName}
                        </span>
                      </div>
                    </div>

                    {/* 시나리오 코드 / 명칭 */}
                    <div className="col-span-2">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold text-blue-800 bg-blue-100 dark:text-blue-200 dark:bg-blue-900 rounded-full w-fit">
                          {scenarioCode}
                        </span>
                        <span className="text-gray-900 dark:text-gray-100 truncate" title={scenarioName}>
                          {scenarioName}
                        </span>
                      </div>
                    </div>

                    {/* 플랫폼 / 앱 */}
                    <div className="col-span-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-800 dark:text-gray-200 font-medium">{platform}</span>
                        <span className="text-gray-600 dark:text-gray-400 truncate" title={appName}>
                          {appName}
                        </span>
                      </div>
                    </div>

                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-base text-gray-400">smartphone</span>
                          <span className="text-gray-700 dark:text-gray-300 truncate" title={udid}>
                            {udid}
                          </span>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <div className="flex flex-col text-gray-700 dark:text-gray-300">
                          <span title={fmtDT(start)}>{fmtDT(start)}</span>
                          <span className="text-gray-500 dark:text-gray-400" title={fmtDT(end)}>{fmtDT(end)}</span>
                        </div>
                      </div>

                      <div className="col-span-1 flex items-center justify-between sm:justify-center gap-2">
                        <ResultBadge result={runResult} />
                        <button
                          onClick={() => setExpandedId(expanded ? null : id)}
                          className="inline-flex items-center gap-1.5 px-2 py-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/20 rounded-md"
                          title="상세 보기"
                        >
                          <span className="material-symbols-outlined text-base">{expanded ? "expand_less" : "expand_more"}</span>
                        </button>
                      </div>
                    </div>

                    {/* 상세 패널: errorMessage / resultLog */}
                    {expanded && (
                      <div className="px-5 pb-4 bg-gray-50/70 dark:bg-gray-800/60">
                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-12 md:col-span-6">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">에러 메시지</div>
                            <pre className="p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs whitespace-pre-wrap break-words">
                              {errorMessage || "-"}
                            </pre>
                          </div>
                          <div className="col-span-12 md:col-span-6">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">결과 로그</div>
                            <pre className="p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs whitespace-pre-wrap break-words">
                              {resultLog || "-"}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        <PaginationBar
          page={page}
          totalPages={data?.totalPages ?? 1}
          size={size}
          totalElements={data?.totalElements}
          unitLabel="개 결과"
          onPageChange={(next) => setPage(next)}
          onSizeChange={(nextSize) => { setSize(nextSize); setPage(1); }}
        />
      </div>
    </>
  );
}
