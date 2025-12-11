import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getScenarioTest } from "../../../services/scenarioAPI";
import { getRecentScenarioTestRuns } from "../../../services/testAPI.js";
import { runScenarioTest } from "../../../services/runAPI.js";
import PageHeader from "../../../shared/components/PageHeader.jsx";
import Toast from "../../../shared/components/Toast.jsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import ExcelEditor from "../../../shared/components/excel/ExcelEditor.jsx";
import { useExcelTabState } from "../../testcase/hooks/useExcelTabState.js";
import { useExcelEditor } from "../../../shared/hooks/useExcelEditor.js";
import { StartChooser } from "../../testcase/components/excel/StartChooser.jsx";
import { downloadFile } from "../../../shared/utils/fileUtils";
import { useToast } from "../../../shared/hooks/useToast.js";
import { toErrorMessage } from "../../../services/axios.js";

// ──────────────────────────────────────────────
// RunResult → PASS / FAIL 단순 매핑
// ──────────────────────────────────────────────
const mapRunResultToStatus = (runResult) => {
  if (!runResult) return "FAIL";
  const v = String(runResult).toUpperCase();
  if (v === "PASS") return "PASS";
  return "FAIL";
};

// ──────────────────────────────────────────────
// 최근 실행 이력(raw) → 차트/테이블용 구조 변환
// ──────────────────────────────────────────────
const transformRecentRuns = (apiRuns) => {
  if (!Array.isArray(apiRuns)) return [];

  const sorted = [...apiRuns].sort((a, b) => {
    const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
    const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
    return tb - ta;
  });

  const total = sorted.length;

  return sorted.map((r, index) => {
    const start = r.startTime ? new Date(r.startTime) : null;
    const end = r.endTime ? new Date(r.endTime) : null;

    let durationSec = 0;
    if (start && end) {
      durationSec = Math.max(
        0,
        Math.round((end.getTime() - start.getTime()) / 1000)
      );
    }

    const isZeroDuration = !end || durationSec === 0;
    const scenarioTestRunId = r.scenarioTestRunId ?? r.id ?? null;

    return {
      id: scenarioTestRunId,
      scenarioTestRunId,
      runNumber: total - index,
      status: mapRunResultToStatus(r.runResult),
      duration: durationSec,
      durationForChart: isZeroDuration ? 1 : durationSec,
      isZeroDuration,
      startedAt: start ? start.toISOString() : null,
      rawRunResult: r.runResult,
      rawTriggerType: r.runTriggerType,
      rawStartTime: r.startTime,
      rawEndTime: r.endTime,
    };
  });
};

// ──────────────────────────────────────────────
// 최근 실행 이력 요약값 계산
// ──────────────────────────────────────────────
const calcSummaryFromRecentRuns = (histories) => {
  const runs = Array.isArray(histories) ? histories : [];
  const total = runs.length;

  if (total === 0) {
    return { passRate: 0, lastRunDurationLabel: "-" };
  }

  const successCount = runs.filter((h) => h.status === "PASS").length;
  const passRate = Math.round((successCount / total) * 100);

  const lastRun = runs[0];
  if (!lastRun || lastRun.duration <= 0) {
    return { passRate, lastRunDurationLabel: "-" };
  }

  const sec = lastRun.duration || 0;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const lastRunDurationLabel = `${m}m ${s}s`;

  return { passRate, lastRunDurationLabel };
};

// ──────────────────────────────────────────────
// 상단 상태 배지 계산
// ──────────────────────────────────────────────
const deriveOverallStatus = (running, recentRuns) => {
  if (running) return "RUNNING";
  const runs = Array.isArray(recentRuns) ? recentRuns : [];
  if (runs.length === 0) return "PENDING";
  return runs[0].status;
};

// ──────────────────────────────────────────────
// 상태 배지
// ──────────────────────────────────────────────
const StatusBadge = ({ running, status }) => {
  if (running) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
        실행 중
      </span>
    );
  }

  switch (status) {
    case "PASS":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
          <span className="material-symbols-outlined text-[14px]">
            check_circle
          </span>
          성공
        </span>
      );
    case "FAIL":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">
          <span className="material-symbols-outlined text-[14px]">
            cancel
          </span>
          실패
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
          <span className="material-symbols-outlined text-[14px]">
            hourglass_empty
          </span>
          대기
        </span>
      );
  }
};

// ──────────────────────────────────────────────
// 플랫폼 아이콘 (Android / iOS)
// ──────────────────────────────────────────────
export const IconApple = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    stroke="none"
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.3-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.86-1.09 1.54-2.5 1.35-3.5-1.27.06-2.81.84-3.71 1.91-.76.88-1.42 2.3-1.23 3.4 1.42.11 2.86-.71 3.59-1.81z" />
  </svg>
);

export const IconAndroid = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    stroke="none"
  >
    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0225 3.503a8.8098 8.8098 0 00-10.273 0l-2.0225-3.503a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592A9.092 9.092 0 002.5 17h19c0-3.3518-1.8518-6.275-4.6185-7.6786" />
  </svg>
);

const PlatformIcon = ({ osType, className = "" }) => {
  const os = String(osType || "").toUpperCase();
  const isIOS = os.includes("IOS");
  const isAndroid = os.includes("ANDROID");

  if (isIOS) {
    return <IconApple className={`w-7 h-7 text-gray-900 ${className}`} />;
  }

  if (isAndroid) {
    return <IconAndroid className={`w-7 h-7 text-emerald-500 ${className}`} />;
  }

  return <IconAndroid className={`w-7 h-7 text-gray-400 ${className}`} />;
};

// ──────────────────────────────────────────────
// 정보 카드
// ──────────────────────────────────────────────
const InfoCard = ({ label, value, icon, subValue }) => (
  <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
    {icon && (
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 text-gray-500 border border-gray-100">
        <span className="material-symbols-outlined text-lg">{icon}</span>
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <div className="mt-1 text-sm font-semibold text-gray-900 truncate">
        {value}
      </div>
      {subValue && (
        <p className="text-xs text-gray-400 mt-0.5 truncate">{subValue}</p>
      )}
    </div>
  </div>
);

// ──────────────────────────────────────────────
// BarChart 커스텀 Tooltip
// ──────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isSuccess = data.status === "PASS";
    const hasDuration = !data.isZeroDuration && data.duration > 0;

    return (
      <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-xs">
        <p className="font-semibold text-gray-900 mb-1">#{data.runNumber}</p>
        <p
          className={`flex items-center gap-1 ${
            isSuccess ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {isSuccess ? "check_circle" : "cancel"}
          </span>
          {isSuccess ? "성공" : "실패"}
        </p>
        <p className="text-gray-500 mt-1">
          {hasDuration
            ? `소요 시간: ${data.duration}s`
            : "소요 시간: 기록 없음 (0초 / 미완료 가능)"}
        </p>
        <p className="text-gray-400 text-[11px] mt-1">
          {data.startedAt
            ? new Date(data.startedAt).toLocaleDateString()
            : "-"}
        </p>
      </div>
    );
  }
  return null;
};

// ──────────────────────────────────────────────
// 시나리오 엑셀 편집 섹션
// ──────────────────────────────────────────────
const ScenarioExcelSection = ({
                                scenarioTestId,
                                scenario,
                                excelFileName,
                                readOnly = false,
                              }) => {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const { ref: excelEditorRef, getSheets } = useExcelEditor();

  const loadExcelAPI = useCallback(async ({ id }) => {
    const res = await fetch(
      `/api/v1/scenarios/tests/${encodeURIComponent(id)}/excel?userId=1`,
      { method: "GET" }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.blob();
  }, []);

  const downloadExcelAPI = useCallback(({ id, downloadName }) => {
    return downloadFile(
      `/api/v1/scenarios/tests/${encodeURIComponent(id)}/excel?userId=1`,
      downloadName
    );
  }, []);

  const uploadExcelAPI = useCallback(
    async ({ id, blob, filename }) => {
      const formData = new FormData();
      formData.append("file", blob, filename);
      formData.append("edited", "true");

      const res = await fetch(
        `/api/v1/scenarios/tests/${encodeURIComponent(id)}/excel?userId=1`,
        {
          method: "POST",
          body: formData,
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
    },
    []
  );

  const {
    // 상태
    excelFile,
    workbook,              // ✅ { [sheetName]: AOA }
    activeSheetAOA,
    isUploading,

    // 파생 상태
    isReadOnly,
    canEdit,
    isLocked,
    hasWorkbook,           // ✅ 훅에서 계산된 플래그

    // 액션
    downloadExcelFromServer,
    loadLocalExcelFile,
    startWithTemplateWorkbook,
    uploadSheetsToServer,
  } = useExcelTabState({
    form: {
      code: scenario?.code,
      name: scenario?.name,
    },
    testCaseId: scenarioTestId,
    excelFileName,
    readOnly,
    loadExcelAPI,
    downloadExcelAPI,
    uploadExcelAPI,
    autoLoadOnMount: true,
    uploadScope: "workbook", // 시나리오는 워크북 단위 업로드
  });

  const isDropDisabled = !canEdit || isUploading;
  const editorReadOnly = readOnly || isReadOnly || isLocked;

  // 파일 input 변경 → 로컬 엑셀 로드
  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      loadLocalExcelFile(f);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 드래그 드롭 업로드
  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) {
      const ok = await loadLocalExcelFile(f);
      if (!ok && fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  // 현재 에디터 내용을 서버에 업로드 (워크북 전체)
  const handleUploadWorkbook = () => {
    if (!excelEditorRef.current) return;
    const sheetsMap = getSheets();             // ✅ { [sheetName]: AOA }
    if (!sheetsMap || Object.keys(sheetsMap).length === 0) {
      console.warn("업로드할 시트 데이터가 없습니다.");
      return;
    }
    uploadSheetsToServer(sheetsMap, scenario?.code, scenarioTestId);
  };

  // ExcelEditor 에 넘길 initialData
  // - useExcelTabState 가 보장하는 workbook 구조 사용
  const initialWorkbook =
    workbook && Object.keys(workbook).length > 0 ? workbook : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 숨겨진 파일 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        onChange={onInputChange}
        disabled={isDropDisabled}
        className="hidden"
      />

      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 border border-gray-200">
            <span className="material-symbols-outlined text-lg">grid_on</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              시나리오 엑셀 데이터
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              테스트 스텝을 정의한 엑셀 데이터 파일입니다.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 다운로드 */}
          {excelFile && (
            <button
              type="button"
              onClick={downloadExcelFromServer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">
                download
              </span>
              다운로드
            </button>
          )}

          {/* 파일 교체 (로컬 파일 선택 → 에디터 내용 교체) */}
          {!editorReadOnly && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDropDisabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-sm">
                file_open
              </span>
              새로 열기
            </button>
          )}

          {/* 업로드 (현재 에디터 내용을 서버에 반영) */}
          {!editorReadOnly && (
            <button
              type="button"
              onClick={handleUploadWorkbook}
              disabled={isUploading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm ${
                isUploading
                  ? "bg-blue-400 text-white cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600"
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                upload
              </span>
              {isUploading ? "업로드 중..." : "업로드"}
            </button>
          )}
        </div>
      </div>

      {/* 드래그 앤 드롭 영역 (엑셀이 아직 없을 때만) */}
      {!editorReadOnly && !hasWorkbook && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`m-6 rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
            dragOver
              ? "border-blue-400 bg-blue-50/40"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <h4 className="text-sm font-semibold text-gray-800 mb-1">
            시나리오 엑셀 파일 생성/등록
          </h4>
          <p className="text-xs text-gray-500 mb-6">
            엑셀 파일을 드래그하거나, 템플릿/빈 파일로 시작할 수 있습니다.
          </p>
          <StartChooser
            disabled={isDropDisabled}
            onPickUpload={() => fileInputRef.current?.click()}
            // ✅ 템플릿 시작 버튼 → 새 워크북 생성
            onPickStepEditor={() => startWithTemplateWorkbook()}
          />
        </div>
      )}

      {/* 엑셀 에디터 */}
      {hasWorkbook && (
        <div className="border-t border-gray-100">
          <div className="h-[460px]">
            <ExcelEditor
              ref={excelEditorRef}
              // ✅ 새 워크북 구조 그대로 전달 (multi-sheet 지원)
              initialData={initialWorkbook}
              title={
                excelFileName ||
                `${scenario?.code || scenarioTestId || "scenario"}.xlsx`
              }
              subtitle={scenario?.name || "시나리오 엑셀"}
              defaultFileName={
                excelFileName ||
                `${scenario?.code || scenarioTestId || "scenario"}.xlsx`
              }
              sheetName={scenario?.code}  // 기본 시트명 힌트
              onSave={(sheetsMap) =>
                uploadSheetsToServer(sheetsMap, scenario?.code, scenarioTestId)
              }
              columnDescriptions={{
                no: "스텝 번호(가급적 숫자로 입력하세요).",
                name: "이 스텝이 수행할 동작을 정의하세요.",
                action: "click / input / tap / image / key / back / swipe ...",
                by: "대상을 찾는 방법 또는 좌표 타입.",
                value: "선택자/좌표/이미지 경로 등.",
                input_text: "입력할 텍스트/특수키.",
                visible_if: "조건부 실행을 위한 표현식.",
                skip_on_error: "에러 무시 여부. Y / N (기본 N)",
                true_jump_no: "성공 시 이동할 스텝 번호",
                false_jump_no: "실패 시 이동할 스텝 번호",
                mandatory: "필수 스텝 여부. Y / N",
                sleep: "실행 전 대기 시간(초).",
              }}
              readOnly={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};
// ──────────────────────────────────────────────
// 메인 페이지
// ──────────────────────────────────────────────
const ScenarioTestDetailPage = () => {
  const { showSuccess, showError } = useToast();
  const { scenarioTestId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const [historySize, setHistorySize] = useState(10);
  const navigate = useNavigate();

  const fetchData = useCallback(
    async (signal) => {
      if (!scenarioTestId) return;
      setLoading(true);
      setError(null);
      try {
        const [detail, recent] = await Promise.all([
          getScenarioTest(scenarioTestId, signal),
          getRecentScenarioTestRuns(scenarioTestId, 30, signal),
        ]);

        const allRecentRuns = transformRecentRuns(recent);

        setData({
          ...detail,
          allRecentRuns,
        });
      } catch (err) {
        if (err?.message !== "Aborted") {
          const detailMessage = toErrorMessage(err);
          showError("데이터를 불러오지 못 했습니다.", detailMessage);
        }
      } finally {
        setLoading(false);
      }
    },
    [scenarioTestId]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
    setToast({
      id: Date.now().toString(),
      type: "info",
      message: "데이터를 새로고침했습니다.",
    });
  };

  const handleClickRunRow = (run) => {
    const scenarioTestRunId = run.scenarioTestRunId ?? run.id;
    if (!scenarioTestRunId) return; // id 없으면 이동 X

    navigate(`/results/${encodeURIComponent(scenarioTestRunId)}/detail`);
  };

  if (loading && !data) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 animate-pulse">
        <div className="h-8 w-1/3 bg-gray-200 rounded mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2 h-64 bg-gray-200 rounded-xl" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12 text-center">
        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
          error_outline
        </span>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          오류가 발생했습니다
        </h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button
          onClick={() => fetchData()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg"
        >
          재시도
        </button>
      </div>
    );
  }

  const allRecentRuns = data?.allRecentRuns || [];
  const visibleRuns = allRecentRuns.slice(0, historySize);

  const overallStatus = deriveOverallStatus(data?.running, allRecentRuns);
  const { passRate, lastRunDurationLabel } =
    calcSummaryFromRecentRuns(visibleRuns);

  const chartRuns = [...visibleRuns].reverse();
  const tableRuns = [...visibleRuns];

  return (
    <div className="flex flex-col gap-6 px-6 py-8 bg-gray-50 min-h-screen">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <PageHeader
        title="시나리오 테스트 상세"
        subtitle="테스트 구성 및 실행 이력을 관리합니다."
        breadcrumbs={[
          { label: "홈", to: "/" },
          { label: "시나리오 테스트", to: "/scenario-tests" },
          { label: data?.testName || "상세 정보" },
        ]}
        actions={
          <>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">
                refresh
              </span>
              새로고침
            </button>
          </>
        }
      />

      {data && (
        <div className="mx-auto w-full space-y-6">
          {/* 상단 요약 카드 */}
          <div className="bg-white border border-gray-200 rounded-2xl px-6 py-5 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4 min-w-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-700 border border-gray-200">
                  <PlatformIcon
                    osType={data.deviceOsType || data.appPlatformType}
                    className="text-2xl"
                  />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                      {data.code}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                    {data.testName}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {data.scenario.name} 시나리오를 기반으로{" "}
                    <span className="font-medium">
                      {data.appPlatformType}
                    </span>{" "}
                    환경에서 실행됩니다.
                  </p>
                </div>
              </div>

              <div className="flex items-stretch gap-8 lg:pl-6 lg:border-l lg:border-gray-200">
                <div className="text-right">
                  <div className="text-[11px] text-gray-500 font-medium">
                    성공률
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-emerald-600">
                    {passRate}%
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-500">
                    최근 {visibleRuns.length}회 기준
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-gray-500 font-medium">
                    최근 소요
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900">
                    {lastRunDurationLabel}
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-500">
                    평균 실행 시간
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 메타 정보 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InfoCard
              label="테스트 앱"
              value={data.testAppName}
              icon="smartphone"
              subValue={`OS: ${data.deviceOsType}`}
            />
            <InfoCard
              label="등록자"
              value={data.creatorName}
              icon="person"
              subValue={new Date(data.createdAt).toLocaleDateString()}
            />
            <InfoCard
              label="시나리오"
              value={
                <Link
                  to={`/scenarios/${data.scenario.id}/detail`}
                  className="hover:text-blue-600 hover:underline"
                >
                  {data.scenario.name}
                </Link>
              }
              icon="account_tree"
              subValue={data.scenario.code}
            />
            <InfoCard
              label="엑셀 데이터"
              value={data.excelFileName || "등록된 엑셀 없음"}
              icon="description"
              subValue={
                data.excelFileName ? "편집 가능" : "업로드 후 편집 가능합니다."
              }
            />
          </div>

          {/* 시나리오 엑셀 섹션 */}
          <ScenarioExcelSection
            scenarioTestId={scenarioTestId}
            scenario={data.scenario}
            excelFileName={data.excelFileName}
            readOnly={false}
          />

          {/* 실행 이력 분석 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-gray-400 mt-0.5">
                  query_stats
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    실행 이력 분석
                  </h3>
                  <p className="text-xs text-gray-500">
                    최근 실행 결과의 PASS/FAIL 추이와 소요 시간을 시각화합니다.
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    전체 {allRecentRuns.length}회 중 최근{" "}
                    {visibleRuns.length}회 표시
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs bg-gray-50 rounded-full p-1 border border-gray-200">
                {[10, 20, 30].map((n) => (
                  <button
                    key={n}
                    onClick={() => setHistorySize(n)}
                    className={`px-3 py-1 rounded-full font-medium transition-colors ${
                      historySize === n
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-gray-600 hover:bg-white"
                    }`}
                  >
                    {n}회
                  </button>
                ))}
              </div>
            </div>

            {/* 차트 */}
            <div className="p-6 pb-2">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartRuns}>
                    <XAxis
                      dataKey="runNumber"
                      tickFormatter={(val) => `#${val}`}
                      tick={{ fontSize: 12, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "#f9fafb" }}
                    />
                    <Bar dataKey="durationForChart" radius={[6, 6, 0, 0]}>
                      {chartRuns.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.isZeroDuration
                              ? "#d1d5db"
                              : entry.status === "PASS"
                                ? "#22c55e"
                                : "#f97373"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-3 text-[11px] text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  성공 (PASS)
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  실패 (FAIL)
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  기록 없음
                </div>
              </div>
            </div>

            {/* 테이블 */}
            <div className="border-t border-gray-100">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-400 uppercase bg-gray-50/70">
                <tr>
                  <th className="px-6 py-3 font-medium">실행 회차</th>
                  <th className="px-6 py-3 font-medium">상태</th>
                  <th className="px-6 py-3 font-medium">실행 일시</th>
                  <th className="px-6 py-3 font-medium text-right">
                    소요 시간
                  </th>
                </tr>
                </thead>
                <tbody>
                {tableRuns.map((run) => {
                  const clickableId = run.scenarioTestRunId ?? run.id;
                  const isClickable = !!clickableId;

                  return (
                    <tr
                      key={run.runNumber}
                      onClick={() => isClickable && handleClickRunRow(run)}
                      className={
                        "border-b border-gray-50 last:border-0 " +
                        (isClickable
                          ? "hover:bg-gray-50/60 cursor-pointer"
                          : "hover:bg-gray-50/40")
                      }
                    >
                      <td className="px-6 py-3 font-medium text-gray-900">
                        #{run.runNumber}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            run.status === "PASS"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                       {run.status === "PASS" ? "성공" : "실패"}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {run.startedAt
                          ? new Date(run.startedAt).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-gray-600">
                        {run.duration > 0 ? (
                          `${run.duration}초`
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-[11px] text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              시간 기록 없음
            </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {tableRuns.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-6 text-center text-gray-400 text-sm"
                    >
                      아직 실행 이력이 없습니다.
                    </td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioTestDetailPage;