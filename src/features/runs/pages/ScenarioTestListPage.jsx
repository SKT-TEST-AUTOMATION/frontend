import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizePage, toErrorMessage } from "../../../services/axios";
import { REQUEST_CANCELED_CODE } from "../../../constants/errors";
import { getScenarioTests } from "../../../services/scenarioAPI";
import PageHeader from "../../../shared/components/PageHeader";
import PaginationBar from "../../../shared/components/PaginationBar";
import DeviceSelectModal from "../components/DeviceSelectModal";
import { runScenarioTest } from "../../../services/runAPI";
import { useToast } from "../../../shared/hooks/useToast";
import React from "react";
import LogStreamPanel from "../components/LogStreamPanel";

import RunReportPanel from "../components/RunReportPanel";
import { ReserveScheduleModal } from "../components/ReserveScheduleModal";
import { generatePath, useNavigate } from 'react-router-dom';

// bit0=MON..bit6=SUN 매핑용
const DAY_OF_WEEK_ENUMS = [
  "MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"
];

// ---- shared helpers (componentized) ----
const WEEKDAYS = [
  { label: "월", bit: 0 },
  { label: "화", bit: 1 },
  { label: "수", bit: 2 },
  { label: "목", bit: 3 },
  { label: "금", bit: 4 },
  { label: "토", bit: 5 },
  { label: "일", bit: 6 },
];
function countBits(n) { let x = n >>> 0, c = 0; while (x) { c += x & 1; x >>>= 1; } return c; }

// Context for providing StatusBadge to row items (avoid referencing memo-wrapped component inside itself)
const StatusBadgeContext = React.createContext(() => null);

// --- Row component: encapsulates one scenario test entry ---
const ScenarioTestRow = React.memo(function ScenarioTestRow({
  row,
  isExpanded,
  expandedRunId,
  onToggleLogs,       // (scenarioTestId, runId?) => void
  onRequestRun,       // (scenarioTestId) => void (opens device picker)
  onRequestReserve,   // (scenarioTestId) => void (opens reserve modal)
  currentRunIdFromParent, // last known runId (if directly started)
  fetchActiveRunId,   // async (scenarioTestId) => runId | null
  logViewMode,        // 'report' | 'text'
  onChangeLogViewMode // (mode) => void
}) {
  const id           = row?.id;
  const testCode     = row?.code ?? "-";
  const testName     = row?.testName ?? "-";
  const platform     = row?.appPlatformType ?? "-";
  const appName      = row?.testAppName ?? "-";
  const deviceOsType = row?.deviceOsType ?? "-";
  const creatorName  = row?.creatorName ?? "-";

  const isRunning = Boolean(row?.running);
  const status    = isRunning ? "RUNNING" : "READY";
  const canRun    = !isRunning;

  // local runId state (prefers parent-provided value if exists)
  const [localRunId, setLocalRunId] = React.useState(currentRunIdFromParent || null);
  React.useEffect(() => {
    if (currentRunIdFromParent && currentRunIdFromParent !== localRunId) {
      setLocalRunId(currentRunIdFromParent);
    }
  }, [currentRunIdFromParent]); // eslint-disable-line

  const onLogsClick = async () => {
    // priority: use local/parent known runId → else fetch active from controller
    let rid = localRunId;
    if (!rid) {
      rid = await fetchActiveRunId(id);
      if (rid) setLocalRunId(rid);
    }
    if (!rid) return; // toast handled by parent
    onToggleLogs(id, rid);
  };

  // StatusBadge from parent scope
  const StatusBadge = React.useContext(StatusBadgeContext);

  const navigate = useNavigate();
  const goDetail = (id) => {
    navigate(generatePath("/runs/:scenarioTestId/detail", { scenarioTestId: id }));
  }

  return (
    <div className="group">
      <div className="grid grid-cols-11 gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
        <div className="col-span-1 text-gray-900 dark:text-gray-100">{id}</div>

        <div className="col-span-3">
          <div className="flex flex-col gap-1  cursor-pointer" onClick={() => goDetail(id)}>
            <span className="text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium truncate" title={testCode}>
              {testCode}
            </span>
            <span className="text-gray-600 dark:text-gray-400 truncate" title={testName}>
              {testName}
            </span>
          </div>
        </div>

        <div className="col-span-2">
          <div className="flex flex-col gap-1">
            <span className="text-gray-800 dark:text-gray-200 font-medium">{platform}</span>
            <span className="text-gray-600 dark:text-gray-400 truncate" title={appName}>
              {appName}
            </span>
          </div>
        </div>

        <div className="col-span-2 flex items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-gray-400">smartphone</span>
            <span className="text-gray-700 dark:text-gray-300 truncate" title={deviceOsType}>
              {deviceOsType}
            </span>
          </div>
        </div>

        <div className="col-span-1 flex items-center">
          <span className="text-gray-700 dark:text-gray-300 truncate" title={creatorName}>
            {creatorName}
          </span>
        </div>

        <div className="col-span-1 flex items-center">
          <div className="flex items-center gap-1.5">
            <StatusBadge status={status} />
          </div>
        </div>

        <div className="col-span-1 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onRequestReserve(id)}
            className="inline-flex items-center justify-center rounded-lg w-8 h-8 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"
            title="예약 생성"
          >
            <span className="material-symbols-outlined text-base">event</span>
          </button>
          <button
            type="button"
            onClick={() => canRun && onRequestRun(id)}
            disabled={!canRun}
            className={[
              "inline-flex items-center justify-center rounded-lg w-8 h-8 transition",
              canRun
                ? "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                : "text-gray-300 cursor-not-allowed",
            ].join(" ")}
            title={canRun ? "실행" : "실행 중에는 다시 실행할 수 없습니다"}
          >
            <span className="material-symbols-outlined text-base">play_arrow</span>
          </button>

          {isRunning && (
            <button
              type="button"
              onClick={onLogsClick}
              className="inline-flex items-center justify-center rounded-lg w-8 h-8 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
              title="실시간 로그 보기"
            >
              <span className="material-symbols-outlined text-base">subject</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded live log panel (single-selection controlled by parent) */}
      {isExpanded && (
        <div className="px-5 pb-5">
          {/* View mode toggle */}
          <div className="mt-2 flex items-center justify-between">
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                className={[
                  "px-3 py-1.5 text-xs font-medium transition",
                  logViewMode === "report"
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                ].join(" ")}
                onClick={() => onChangeLogViewMode("report")}
                title="리포트 보기"
              >
                리포트
              </button>
              <button
                type="button"
                className={[
                  "px-3 py-1.5 text-xs font-medium transition",
                  logViewMode === "text"
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                ].join(" ")}
                onClick={() => onChangeLogViewMode("text")}
                title="텍스트 로그 보기"
              >
                텍스트
              </button>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Run ID: <span className="font-mono">{expandedRunId}</span>
            </div>
          </div>

          {/* Panel */}
          <div className="mt-3">
            {logViewMode === "report" ? (
              <RunReportPanel
                testName={testName}
                runId={expandedRunId}
                onClose={() => onToggleLogs(id, null)} // closes
              />
            ) : (
              <LogStreamPanel
                runId={expandedRunId}
                onClose={() => onToggleLogs(id, null)} // closes
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
});
// --- end row component ---



export default function ScenarioTestListPage() {
  const { showToast } = useToast();
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
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const StatusBadge = ({ status }) => {
    const map = {
      READY:   { t: "READY",   c: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-200" },
      RUNNING: { t: "RUNNING", c: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200" },
    };
    const m = map[status] || map["READY"];
    return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${m.c}`}>{m.t}</span>;
  };

  const fetchTests = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getScenarioTests({ page: page-1, size, sort: "id,desc" }, signal);
      const data = normalizePage(res);
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
    fetchTests(controller.signal);
    return () => controller.abort();
  }, [fetchTests]);

  // ── 필터링 (ScenarioListPage와 동일 패턴)
  const filtered = useMemo(() => {
    if (!searchTerm) return rows;
    const s = String(searchTerm).toLowerCase();
    return rows.filter((r) =>
      String(r?.code ?? "").toLowerCase().includes(s) ||
      String(r?.testName ?? "").toLowerCase().includes(s) ||
      String(r?.appPlatformType ?? r?.platform ?? "").toLowerCase().includes(s) ||
      String(r?.testAppName ?? "").toLowerCase().includes(s) ||
      String(r?.deviceOsType ?? "").toLowerCase().includes(s) ||
      String(r?.creatorName ?? "").toLowerCase().includes(s)
    );
  }, [rows, searchTerm]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserveTestId, setReserveTestId] = useState(null);

  // single expanded row state
  // shape: { id: number|null, runId: number|null }
  const [expandedOne, setExpandedOne] = useState({ id: null, runId: null });
  // 'report' or 'text' — single expanded row만 존재하므로 페이지 단위 상태로 관리
  const [logViewMode, setLogViewMode] = useState("report");
  // store last known runId per scenarioTestId (when directly started)
  const [runIds, setRunIds] = useState({});

  const openPicker = (testId) => {
    setSelectedTestId(testId);
    setPickerOpen(true);
  };
  const closePicker = () => {
    setPickerOpen(false);
    setSelectedTestId(null);
  };
  // fetch helper used by rows
  const fetchActiveRunId = async (scenarioTestId) => {
    const resp = await fetch(`/api/v1/scenarios/tests/${scenarioTestId}/active-run`, { credentials: "include" });
    if (resp.status === 204) {
      showToast("info", "현재 실행 중인 Run이 없습니다.");
      return null;
    }
    const body = await resp.json();
    const runId = body?.data ?? body;
    if (!runId) {
      showToast("error", "active runId를 가져오지 못했습니다.");
      return null;
    }
    return runId;
  };

  // 예약 모달 open/close
  const openReserve = (testId) => { setReserveTestId(testId); setReserveOpen(true); };
  const closeReserve = () => { setReserveOpen(false); setReserveTestId(null); };

  // single-selection toggle (open different row or close current)
  const toggleLogs = async (scenarioTestId, optionalRunId) => {
    // close if already open the same row
    if (expandedOne.id === scenarioTestId) {
      setExpandedOne({ id: null, runId: null });
      return;
    }
    let runId = optionalRunId || runIds[scenarioTestId];
    if (!runId) {
      runId = await fetchActiveRunId(scenarioTestId);
      if (!runId) return;
    }
    setExpandedOne({ id: scenarioTestId, runId });
  };

  const handlePick = async (device) => {
    if (!selectedTestId || !device) return;

    // RunScenarioTestDto.Request 규격에 맞춰 payload 구성 (모두 문자열)
    const payload = {
      deviceUdid:  String(device.udid ?? ""),
      connectedIp: String(device.connectedIp ?? "127.0.0.1"),
      appiumPort:  String(device.appiumPort ?? 4723),
      systemPort:  String(device.systemPort ?? ""), // iOS면 빈 문자열 가능
    };

    try {
      const res = await runScenarioTest(selectedTestId, payload);
      // 응답에서 runId 추출 (API 스펙에 맞게 조정)
      const runIdFromRes = res?.runId ?? null;

      if (runIdFromRes) {
        setRunIds(prev => ({ ...prev, [selectedTestId]: runIdFromRes }));
        // 자동으로 로그 패널 오픈 (단일 선택 정책)
        setExpandedOne({ id: selectedTestId, runId: runIdFromRes });
      }

      showToast("success", "테스트가 실행되었습니다.");
      const controller = new AbortController();
      await fetchTests(controller.signal);
    } catch (e) {
      showToast("error", "테스트 실행 요청에 실패했습니다.");
      console.error("실행 요청 실패:", e);
    } finally {
      closePicker();
    }
  };

  const HEADERS = [
    { key: "id",          label: "테스트 ID",          span: 1, align: "left" },
    { key: "test",        label: "테스트 코드 / 명칭", span: 3 },
    { key: "appPlatform", label: "플랫폼 / 앱",        span: 2 },
    { key: "device",      label: "디바이스 OS",        span: 2 },
    { key: "creator",     label: "등록자",             span: 1 },
    { key: "status",      label: "상태",               span: 1, align: "left" },
    { key: "run",         label: "실행",               span: 1, align: "left" },
  ];

  return (
    <>
      <div className="flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-sm">
        <PageHeader title="테스트 실행 목록" subtitle="실행 가능한 시나리오를 관리합니다." />

        {/* 검색 및 필터 바 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3.5">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-base">search</span>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="테스트 코드, 이름, 앱, 디바이스 OS, 작성자 검색..."
                className="w-full h-10 pl-10 pr-3.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="grid grid-cols-11 gap-4 px-5 py-3.5 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
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

          {loading && (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="grid grid-cols-11 gap-4 px-5 py-3.5">
                  {[1,3,2,2,1,1,1].map((span, idx) => (
                    <div key={idx} className={`col-span-${span}`}>
                      <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="px-5 py-6 text-sm text-rose-600 dark:text-rose-300">{error}</div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-sm">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3.5">
                <span className="material-symbols-outlined text-gray-400 text-xl">list_alt</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">데이터가 없습니다</h3>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">페이지 크기를 변경해 보세요.</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <StatusBadgeContext.Provider value={StatusBadge}>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((r) => {
                  const id = r?.id;
                  return (
                    <ScenarioTestRow
                      key={id}
                      row={r}
                      isExpanded={expandedOne.id === id}
                      expandedRunId={expandedOne.runId}
                      onToggleLogs={toggleLogs}
                      onRequestRun={openPicker}
                      onRequestReserve={openReserve}
                      currentRunIdFromParent={runIds[id]}
                      fetchActiveRunId={fetchActiveRunId}
                      logViewMode={logViewMode}
                      onChangeLogViewMode={setLogViewMode}
                    />
                  );
                })}
              </div>
            </StatusBadgeContext.Provider>
          )}
        </div>

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
      {
        pickerOpen && (
          <DeviceSelectModal onClose={closePicker} onConfirm={handlePick} />
        )
      }
      {
        reserveOpen && (
          <ReserveScheduleModal
            testId={reserveTestId}
            onClose={closeReserve}
            onSuccess={() => { showToast("success", "예약이 생성되었습니다."); }}
            onError={(msg) => showToast("error", msg)}
          />
        )
      }
    </>
  );
}