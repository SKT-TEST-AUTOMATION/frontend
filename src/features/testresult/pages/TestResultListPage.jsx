import { useCallback, useEffect, useState } from "react";
import { normalizePage, toErrorMessage } from "../../../services/axios";
import PageHeader from "../../../shared/components/PageHeader";
import PaginationBar from "../../../shared/components/PaginationBar";
import { getScenarioTestResults } from "../../../services/scenarioAPI";
import { getScenarioTestCaseResults } from "../../../services/runAPI";
import fmtDT from "../../../shared/utils/dateUtils";
import { REQUEST_CANCELED_CODE } from "../../../constants/errors";

import RunReportPanel from "../../runs/components/RunReportPanel";
import EvidenceModal from "../../runs/components/EvidenceModal.jsx";
import JiraIssueModal from "../../runs/components/JiraIssueModal.jsx";
import { formatMs } from '../../../shared/utils/timeUtils.js';

function ResultBadge({ result }) {
  const map = {
    PASS: {
      t: "PASS",
      c: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
    },
    FAIL: {
      t: "FAIL",
      c: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
    },
    "N/A": {
      t: "N/A",
      c: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    },
  };
  const m = map[result] || map["N/A"];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${m.c}`}>
      {m.t}
    </span>
  );
}

const API_ORIGIN =
  (import.meta.env.VITE_BACKEND_ORIGIN ?? "") ||
  (import.meta.env.DEV ? "http://localhost:18080" : "");

export default function TestResultListPage() {
  // ---- 기본 상태 ----
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [data, setData] = useState({
    content: [],
    totalElements: 0,
    totalPages: 1,
    number: 0,
    size: 10,
  });
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1); // 화면 1-based
  const [size, setSize] = useState(10);

  // ---- 상세 토글 ----
  const [expandedId, setExpandedId] = useState(null);

  // ---- per-run 테스트케이스 캐시 ----
  // { [runId]: { loading: boolean, error: string|null, rows: any[] } }
  const [tcMap, setTcMap] = useState({});

  const handleExpandToggle = useCallback(
    async (runId) => {
      setExpandedId((prev) => (prev === runId ? null : runId));

      // 펼칠 때 + 아직 데이터가 없을 때만 호출
      if (expandedId !== runId && !tcMap[runId]) {
        setTcMap((m) => ({
          ...m,
          [runId]: { loading: true, error: null, rows: [] },
        }));
        try {
          const res = await getScenarioTestCaseResults(runId);
          const rows = Array.isArray(res) ? res : res?.content || [];
          setTcMap((m) => ({
            ...m,
            [runId]: { loading: false, error: null, rows },
          }));
        } catch (err) {
          setTcMap((m) => ({
            ...m,
            [runId]: {
              loading: false,
              error: toErrorMessage(err),
              rows: [],
            },
          }));
        }
      }
    },
    [expandedId, tcMap]
  );

  // ---- 증거(스크린샷) 프리뷰 ----
  const [evidencePreview, setEvidencePreview] = useState({
    open: false,
    images: [],
  });

  // ---- JIRA 이슈 생성 모달 상태 ----
  const [jiraModal, setJiraModal] = useState({
    open: false,
    loading: false,
    runId: null,
    testCaseId: null,
    deviceName: null,
    deviceUdid: null,
    scenarioTestCaseResultId: null,
    sheet: null,
    stepNo: null,

    // form 값
    summary: "",
    description: "",
    labels: "qaone,automation",
    priority: "Major",
    includeArtifacts: false,

    // context (reset / 재생성용)
    testCaseCode: null,
    testCaseName: null,
    scenarioTestName: null,
    logText: null,
    result: null,
  });

  // ---- Jira Modal helpers ----
  const SUMMARY_MAX = 255;
  const trimSummary = (s) => (s ? String(s).slice(0, SUMMARY_MAX) : "");

  // JIRA description 템플릿
  const buildJiraDescription = ({
                                  runId,
                                  testCaseId,
                                  testCaseCode: testCode,
                                  testCaseName: caseName,
                                  scenarioTestName,
                                  deviceName,
                                  deviceUdid,
                                  result,
                                  logText,
                                }) => {
    // 실행 날짜: YYYY/MM/D (월은 두 자리, 일은 한 자리)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const d = now.getDate(); // D (no leading zero)

    const header = `# [${yyyy}/${mm}/${d}] ${scenarioTestName} 테스트 중 ${caseName} 실패`;

    const lines = [
      header,
      "",
      "1. 실행 테스트",
      `    - ID : ${runId ?? "-"}`,
      `    - Name : ${scenarioTestName ?? "-"}`,
      "2. 테스트 케이스",
      `    - ID : ${testCaseId ?? "-"}`,
      `    - Code : ${testCode ?? "-"}`,
      `    - Name : ${caseName ?? "-"}`,
      "3. 디바이스",
      `    - Name : ${deviceName ?? "-"}`,
      `    - UDID : ${deviceUdid ?? "-"}`,
      "4. 결과",
      `    - ${result ?? "FAIL"}`,
      `    - ${logText ?? "-"}`,
      "5. 예상 동작",
      "    - (QA 직접 입력) 이 단계에서 기대했던 화면/상태를 적어주세요.",
      "6. 실제 동작",
      "    - (자동화 실패) 실행 중 오류가 감지되었습니다.",
      "    - (QA 직접 입력) 앱에서 실제로 관찰된 결과를 적어주세요.",
      "7. 필요 조치",
      "    - (QA 직접 입력) 필요한 조치 처리를 적어주세요.",
      "8. 비고",
      "    - 기타 참고사항이 있다면 입력해주세요.",
    ];
    return lines.join("\n");
  };

  // JIRA 모달 열기
  const openJiraCreateModal = useCallback(
    (runId, tc, testCode, caseName, scenarioTestName, deviceName, deviceUdid) => {
      const testCaseId = tc?.testCaseId ?? tc?.id ?? null;
      const scenarioTestCaseResultId = tc?.id ?? null;
      const sheet = tc?.sheet ?? tc?.sheetName ?? tc?.sheet_name ?? null;
      const stepNo = tc?.stepNo ?? tc?.step_no ?? null;
      const result = tc?.runResult ?? tc?.result ?? "FAIL";
      const logText = tc?.log ?? tc?.resultLog ?? tc?.logText ?? "-";

      // 요약 포맷: "[YYYY/MM/DD] {테스트 이름} 실패 결과 보고"
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const displayName =
        scenarioTestName && scenarioTestName !== "-"
          ? scenarioTestName
          : caseName || testCode || "테스트";
      const defaultSummary = `[${yyyy}/${mm}/${dd}] ${displayName} 실패 결과 보고`;

      const defaultDescription = buildJiraDescription({
        runId,
        testCaseId,
        testCaseCode: testCode,
        testCaseName: caseName,
        scenarioTestName,
        deviceName,
        deviceUdid,
        result,
        logText,
      });

      setJiraModal({
        open: true,
        loading: false,
        runId,
        testCaseId,
        deviceName,
        deviceUdid,
        scenarioTestCaseResultId,
        sheet,
        stepNo: stepNo ? String(stepNo) : null,
        // context
        testCaseCode: testCode,
        testCaseName: caseName,
        scenarioTestName,
        logText,
        result,
        // form 값
        summary: defaultSummary,
        description: defaultDescription,
        labels: "qaone,automation",
        priority: "Major",
        includeArtifacts: true,
      });
    },
    []
  );

  const resetJiraToDefault = useCallback(() => {
    setJiraModal((m) => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const displayName =
        m.scenarioTestName && m.scenarioTestName !== "-"
          ? m.scenarioTestName
          : m.testCaseName || m.testCaseCode || "테스트";
      const newSummary = `[${yyyy}/${mm}/${dd}] ${displayName} 실패 결과 보고`;
      const newDescription = buildJiraDescription({
        runId: m.runId,
        testCaseId: m.testCaseId,
        testCaseCode: m.testCaseCode,
        testCaseName: m.testCaseName,
        scenarioTestName: m.scenarioTestName,
        deviceName: m.deviceName,
        deviceUdid: m.deviceUdid,
        result: m.result,
        logText: m.logText,
      });
      return { ...m, summary: newSummary, description: newDescription };
    });
  }, []);

  // JIRA 이슈 생성 요청
  const submitJiraCreate = useCallback(async () => {
    try {
      setJiraModal((m) => ({ ...m, loading: true }));
      const body = {
        summary: trimSummary(jiraModal.summary),
        description: jiraModal.description,
        priority: jiraModal.priority,
        labels: String(jiraModal.labels || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        includeArtifacts: !!jiraModal.includeArtifacts,
        scenarioTestRunId: jiraModal.runId,
        ScenarioTestCaseResultId: jiraModal.scenarioTestCaseResultId ?? null,
        testCaseId: jiraModal.testCaseId,
        sheet: jiraModal.sheet,
        stepNo: jiraModal.stepNo,
      };

      const resp = await fetch(`/api/v1/integrations/jira/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const issueKey = data?.data?.issueKey;

      // 로컬 UI 갱신
      setTcMap((prev) => {
        const m = { ...prev };
        const b = m[jiraModal.runId];
        if (!b) return prev;
        const rows = (b.rows || []).map((r) => {
          const rId = r?.testCaseId ?? r?.id;
          if (rId === jiraModal.testCaseId) {
            return { ...r, issueId: issueKey };
          }
          return r;
        });
        return { ...m, [jiraModal.runId]: { ...b, rows } };
      });

      alert(`JIRA 생성 완료: ${issueKey}`);
      setJiraModal((m) => ({ ...m, open: false, loading: false }));
    } catch (e) {
      console.error(e);
      alert(`JIRA 생성 실패: ${toErrorMessage?.(e) || e.message}`);
      setJiraModal((m) => ({ ...m, loading: false }));
    }
  }, [jiraModal, trimSummary]);

  // ---- evidence 파싱 ----
  const parseEvidenceList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    const s = String(val).trim();
    if (!s) return [];
    // JSON 배열 형태
    if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
      try {
        const j = JSON.parse(s);
        return Array.isArray(j) ? j.filter(Boolean) : j?.paths || [];
      } catch (_) {
        // fallthrough
      }
    }
    return s
      .split(/[\s,;]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  };

  // ---- evidence URL 매핑 ----
  const toEvidenceUrl = (p) => {
    if (!p) return null;
    let v = String(p).trim();
    if (/^(https?:)?\/\//i.test(v) || v.startsWith("data:")) return v;
    v = v.replace(/\\/g, "/");
    if (v.startsWith("/artifacts/")) return `${API_ORIGIN}${v}`;
    if (v.startsWith("/")) return v;
    const idx = v.toLowerCase().indexOf("artifacts/");
    if (idx >= 0) {
      const sub = v.slice(idx + "artifacts/".length);
      return `${API_ORIGIN}/artifacts/${encodeURI(sub)}`;
    }
    const cleaned = v.replace(/^(\.\/|\/)+/, "");
    return `${API_ORIGIN}/artifacts/${encodeURI(cleaned)}`;
  };

  const handleJiraChange = useCallback((field, value) => {
    setJiraModal((m) => ({ ...m, [field]: value }));
  }, []);

  // ---- 결과 조회 ----
  const fetchResults = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await getScenarioTestResults(
          { page: page - 1, size, sort: "id,desc" },
          signal
        );
        const data = normalizePage(res);
        setData(data);
        setRows(data.content);
      } catch (err) {
        if (err?.code === REQUEST_CANCELED_CODE) return;
        setError(toErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [page, size]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchResults(controller.signal);
    return () => controller.abort();
  }, [fetchResults]);

  // ---- 테이블 헤더 ----
  const HEADERS = [
    { key: "id", label: "실행 ID", span: 1, align: "left" },
    { key: "test", label: "테스트 코드 / 명칭", span: 2 },
    { key: "scenario", label: "시나리오 코드 / 명칭", span: 2 },
    { key: "platform", label: "플랫폼 / 앱", span: 2 },
    { key: "device", label: "디바이스(UDID)", span: 2 },
    { key: "time", label: "시작 / 종료", span: 2 },
    { key: "result", label: "결과", span: 1, align: "center" },
  ];

  return (
    <>
      <div className="flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-sm">
        {/* 헤더 */}
        <PageHeader
          title="테스트 결과"
          subtitle="시나리오 실행 결과를 확인하고 관리합니다."
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
                  align ? align : "",
                ].join(" ")}
              >
                {label}
              </div>
            ))}
          </div>

          {/* 로딩 */}
          {loading && (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-5 py-3.5">
                  {[1, 2, 2, 2, 2, 2, 1].map((span, idx) => (
                    <div key={idx} className={`col-span-${span}`}>
                      <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* 에러 */}
          {!loading && error && (
            <div className="px-5 py-6 text-sm text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* 빈 상태 */}
          {!loading && !error && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-sm">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3.5">
                <span className="material-symbols-outlined text-gray-400 text-xl">
                  list_alt
                </span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
                결과가 없습니다
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                페이지 크기를 변경해 보세요.
              </p>
            </div>
          )}

          {/* 목록 */}
          {!loading && !error && rows.length > 0 && (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((r) => {
                // r: ScenarioTestRunDto
                const id = r?.id;
                const st = r?.scenarioTest; // ScenarioTestDto
                const sc = st?.scenario; // ScenarioDto

                const scenarioCode = sc?.code ?? "-";
                const scenarioName = sc?.name ?? "-";
                const testCode = st?.code ?? "-";
                const testName = st?.testName ?? "-";
                const platform = st?.appPlatformType ?? "-";
                const appName = st?.testAppName ?? "-";

                const udid = r?.deviceUdid ?? "-";
                const deviceName = r?.deviceName ?? "-";

                const start = r?.startTime;
                const end = r?.endTime;
                const runResult = r?.runResult ?? "N/A";
                const errorMessage = r?.errorMessage;
                const resultLog = r?.resultLog;

                const expanded = expandedId === id;

                return (
                  <div key={id} className="group">
                    {/* 한 줄 요약 Row */}
                    <div className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      {/* 실행 ID */}
                      <div className="col-span-1 text-gray-900 dark:text-gray-100">
                        {id}
                      </div>

                      {/* 테스트 코드 / 이름 */}
                      <div className="col-span-2">
                        <div className="flex flex-col gap-1">
                          <span
                            className="text-gray-800 dark:text-gray-200 font-medium truncate"
                            title={testCode}
                          >
                            {testCode}
                          </span>
                          <span
                            className="text-gray-600 dark:text-gray-400 truncate"
                            title={testName}
                          >
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
                          <span
                            className="text-gray-900 dark:text-gray-100 truncate"
                            title={scenarioName}
                          >
                            {scenarioName}
                          </span>
                        </div>
                      </div>

                      {/* 플랫폼 / 앱 */}
                      <div className="col-span-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-800 dark:text-gray-200 font-medium">
                            {platform}
                          </span>
                          <span
                            className="text-gray-600 dark:text-gray-400 truncate"
                            title={appName}
                          >
                            {appName}
                          </span>
                        </div>
                      </div>

                      {/* 디바이스 (Name / UDID) */}
                      <div className="col-span-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-800 dark:text-gray-200 font-medium">
                            {deviceName}
                          </span>
                          <span
                            className="text-gray-600 dark:text-gray-400 truncate"
                            title={udid}
                          >
                            {udid}
                          </span>
                        </div>
                      </div>

                      {/* 시작 / 종료 */}
                      <div className="col-span-2">
                        <div className="flex flex-col text-gray-700 dark:text-gray-300">
                          <span title={fmtDT(start)}>{fmtDT(start)}</span>
                          <span
                            className="text-gray-500 dark:text-gray-400"
                            title={fmtDT(end)}
                          >
                            {fmtDT(end)}
                          </span>
                        </div>
                      </div>

                      {/* 결과 / 상세 버튼 */}
                      <div className="col-span-1 flex items-center justify-between sm:justify-center gap-2">
                        <ResultBadge result={runResult} />
                        <button
                          onClick={() => handleExpandToggle(id)}
                          className="inline-flex items-center gap-1.5 px-2 py-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/20 rounded-md"
                          title="상세 보기"
                        >
                          <span className="material-symbols-outlined text-base">
                            {expanded ? "expand_less" : "expand_more"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* 상세 패널 */}
                    {expanded && (
                      <div className="px-5 pb-4 bg-gray-50/70 dark:bg-gray-800/60">
                        <div className="grid grid-cols-12 gap-4">
                          {/* 테스트 케이스 결과 테이블 */}
                          <div className="col-span-12">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                테스트 케이스 결과
                              </div>
                              {tcMap[id]?.loading && (
                                <span className="text-[11px] text-gray-500">
                                  불러오는 중…
                                </span>
                              )}
                            </div>

                            {tcMap[id]?.error && (
                              <div className="text-xs text-rose-600 dark:text-rose-300">
                                {tcMap[id].error}
                              </div>
                            )}

                            {!tcMap[id]?.loading && !tcMap[id]?.error && (
                              <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                                {/* header */}
                                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-900 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                                  <div className="col-span-2">케이스 ID</div>
                                  <div className="col-span-5">케이스명</div>
                                  <div className="col-span-2">
                                    실행시간(ms)
                                  </div>
                                  <div className="col-span-1 text-center">
                                    결과
                                  </div>
                                  <div className="col-span-1 text-center">
                                    증거
                                  </div>
                                  <div className="col-span-1 text-center">
                                    이슈
                                  </div>
                                </div>
                                {/* rows */}
                                {(tcMap[id]?.rows?.length || 0) === 0 ? (
                                  <div className="px-3 py-6 text-[12px] text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">
                                    결과가 없습니다
                                  </div>
                                ) : (
                                  <div className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                    {tcMap[id].rows.map((tc, i) => {
                                      const caseId =
                                        tc?.testCaseId ??
                                        tc?.id ??
                                        `#${i + 1}`;
                                      const caseCode =
                                        tc?.testCaseCode ??
                                        tc?.code ??
                                        "-";
                                      const caseName =
                                        tc?.testCaseName ??
                                        tc?.name ??
                                        "-";
                                      const durMs =
                                        tc?.durationMs ??
                                        "-";
                                      const result =
                                        tc?.runResult ??
                                        tc?.result ??
                                        "N/A";
                                      const issueId =
                                        tc?.issueId ??
                                        tc?.issue ??
                                        tc?.jiraIssueKey ??
                                        null;
                                      const evidenceStr =
                                        tc?.errorEvidence ??
                                        tc?.error_evidence ??
                                        null;
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
                                                  const imgs = parseEvidenceList(
                                                    evidenceStr
                                                  )
                                                    .map(toEvidenceUrl)
                                                    .filter(Boolean);
                                                  setEvidencePreview({
                                                    open: true,
                                                    images: imgs,
                                                  });
                                                }}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                title="증거 보기"
                                              >
                                                <span className="material-symbols-outlined text-base leading-none">
                                                  image
                                                </span>
                                                <span className="hidden sm:inline">
                                                  보기
                                                </span>
                                              </button>
                                            ) : (
                                              <span className="text-gray-400">
                                                -
                                              </span>
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
                                                  openJiraCreateModal(
                                                    id,
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
                                                <span className="hidden sm:inline">
                                                  생성
                                                </span>
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

                          {/* 에러 메시지 */}
                          <div className="col-span-12">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                              에러 메시지
                            </div>
                            <pre className="p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs whitespace-pre-wrap break-words">
                              {errorMessage || "-"}
                            </pre>
                          </div>

                          {/* 결과 로그 */}
                          <div className="col-span-12">
                            <RunReportPanel
                              runId={id}
                              live={false}
                              resultLog={resultLog}
                            />
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
          onSizeChange={(nextSize) => {
            setSize(nextSize);
            setPage(1);
          }}
        />
      </div>

      {/* JIRA 이슈 생성 모달 */}
      <JiraIssueModal
        open={jiraModal.open}
        loading={jiraModal.loading}
        summary={jiraModal.summary}
        description={jiraModal.description}
        labels={jiraModal.labels}
        priority={jiraModal.priority}
        includeArtifacts={jiraModal.includeArtifacts}
        summaryMax={SUMMARY_MAX}
        trimSummary={trimSummary}
        onChange={handleJiraChange}
        onClose={() =>
          setJiraModal((m) => ({
            ...m,
            open: false,
          }))
        }
        onSubmit={submitJiraCreate}
        onReset={resetJiraToDefault}
      />

      {/* 증거(스크린샷) 미리보기 모달 */}
      <EvidenceModal
        open={evidencePreview.open}
        images={evidencePreview.images}
        onClose={() => setEvidencePreview({ open: false, images: [] })}
      />
    </>
  );
}
