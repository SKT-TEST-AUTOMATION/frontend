// src/features/testresult/pages/TestResultDetailPage.jsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

import PageHeader from "../../../shared/components/PageHeader";
import fmtDT from "../../../shared/utils/dateUtils";
import { formatMs } from "../../../shared/utils/timeUtils.js";
import ResultBadge from "../components/ResultBadge";
import TestCaseResultTable from "../components/TestCaseResultTable.jsx";
import RunReportPanel from "../../runs/components/RunReportPanel";
import EvidenceModal from "../../runs/components/EvidenceModal.jsx";
import JiraIssueModal from "../../runs/components/JiraIssueModal.jsx";
import FailCodeModal from "../components/FailCodeModal.jsx";
import ResultSummaryPanel from "../components/ResultSummaryPanel.jsx";

import { useJiraIssueModal } from "../hooks/useJiraIssueModal";
import { useScenarioTestRunDetail } from "../hooks/useScenarioTestRunDetail.js";
import { useToast } from "../../../shared/hooks/useToast.js";
import { toErrorMessage } from "../../../services/axios.js";
import {
  updateScenarioTestRunComment,
  updateTestCaseResultFailMeta,
} from "../../../services/testAPI.js";

function normalizeRunResult(value) {
  if (value == null) return "N_A";
  const s = String(value).toUpperCase();
  if (s === "SUCCESS" || s === "OK") return "PASS";
  if (s === "FAILURE" || s === "ERROR") return "FAIL";
  return s;
}

/**
 * 테스트 실행 상세 페이지
 * URL 예시: /results/:scenarioTestRunId/detail
 */
export default function TestResultDetailPage() {
  const { scenarioTestRunId } = useParams();
  const { showSuccess, showError } = useToast();

  const { run, testCases, setTestCases, loading, error } =
    useScenarioTestRunDetail(scenarioTestRunId);

  // JIRA 이슈 생성 시 testCases 배열을 갱신하기 위한 updater
  const updateTestCaseIssue = useCallback(
    ({ testCaseResultId, jiraIssueKey }) => {
      setTestCases((prev) =>
        (prev ?? []).map((tc) =>
          tc.id === testCaseResultId ? { ...tc, jiraIssueKey } : tc
        )
      );
    },
    [setTestCases]
  );

  // JIRA 모달 상태/동작
  const {
    jiraModal,
    SUMMARY_MAX,
    trimSummary,
    openJiraCreateModal,
    resetJiraToDefault,
    handleJiraChange,
    closeJiraModal,
    submitJiraCreate,
  } = useJiraIssueModal({
    onIssueCreated: updateTestCaseIssue,
  });

  // 증거(스크린샷) 프리뷰 모달
  const [evidencePreview, setEvidencePreview] = useState({
    open: false,
    images: [],
  });

  // 실패 코드 모달 상태
  const [failCodeModal, setFailCodeModal] = useState({
    open: false,
    currentFailCode: null,
    currentFailComment: "",
    targetInfo: null,
    payload: null,
  });

  const handleOpenFailCodeModal = (payload) => {
    setFailCodeModal({
      open: true,
      currentFailCode: payload?.failCode ?? null,
      currentFailComment: payload?.failComment ?? "",
      targetInfo: {
        caseCode: payload?.caseCode ?? "-",
        caseName: payload?.caseName ?? "-",
      },
      payload,
    });
  };

  const handleCloseFailCodeModal = () => {
    setFailCodeModal({
      open: false,
      currentFailCode: null,
      currentFailComment: "",
      targetInfo: null,
      payload: null,
    });
  };

  // 실패 코드 저장 핸들러 (refetchRunCases/expandedId 제거 + 로컬 상태 반영)
  const handleSaveFailMeta = async ({ testFailCode, failComment }) => {
    const { payload } = failCodeModal;
    if (!payload) return;

    const testCaseResultId = payload?.testCaseRow?.id;
    if (!testCaseResultId) return;

    try {
      await updateTestCaseResultFailMeta(testCaseResultId, {
        testFailCode,
        failComment,
      });

      // 현재 상세 페이지의 testCases를 로컬 업데이트로 반영
      setTestCases((prev) =>
        (prev ?? []).map((tc) => {
          if (tc?.id !== testCaseResultId) return tc;

          // 서버 DTO 형태가 흔들릴 수 있으므로, 최소한 TestCaseResultTable이 쓰는 필드를 맞춰줍니다.
          const nextFailCode =
            testFailCode == null
              ? null
              : typeof testFailCode === "string"
                ? { code: testFailCode }
                : testFailCode;

          return {
            ...tc,
            testFailCode: nextFailCode,
            failComment: failComment ?? "",
          };
        })
      );

      showSuccess("변경 사항이 저장되었습니다.");
      handleCloseFailCodeModal();
    } catch (e) {
      showError(toErrorMessage(e));
    }
  };

  // TestCaseResultTable에서 기대하는 block 형태 어댑터
  const testCaseBlock = useMemo(
    () => ({
      loading,
      error,
      rows: testCases ?? [],
    }),
    [loading, error, testCases]
  );

  // run 정보 분해
  const scenarioTest = run?.scenarioTest;
  const scenario = scenarioTest?.scenario;

  const scenarioCode = scenario?.code ?? "-";
  const scenarioName = scenario?.name ?? "-";
  const testCode = scenarioTest?.code ?? "-";
  const testName = scenarioTest?.testName ?? "-";
  const platform = scenarioTest?.appPlatformType ?? "-";
  const appName = scenarioTest?.testAppName ?? "-";

  const udid = run?.deviceUdid ?? "-";
  const deviceName = run?.deviceName ?? "-";
  const deviceOs = run?.deviceOs ?? "-";

  const start = run?.startTime;
  const end = run?.endTime;
  const runResultRaw = run?.runResult ?? "N_A";
  const runResult = normalizeRunResult(runResultRaw);
  const errorMessage = run?.errorMessage;
  const resultLog = run?.resultLog;
  const runTriggerType = run?.runTriggerType ?? "-";

  // 테스트케이스 단위 통계
  const tcStats = useMemo(() => {
    const list = testCases ?? [];
    const total = list.length;

    const agg = { total, pass: 0, fail: 0, na: 0, skip: 0 };

    list.forEach((tc) => {
      switch (normalizeRunResult(tc?.result)) {
        case "PASS":
          agg.pass += 1;
          break;
        case "FAIL":
          agg.fail += 1;
          break;
        case "N_A":
          agg.na += 1;
          break;
        case "SKIP":
          agg.skip += 1;
          break;
        default:
          break;
      }
    });

    return agg;
  }, [testCases]);

  // 스텝 단위 통계: 도넛 차트용
  const stepStats = useMemo(() => {
    const agg = { total: 0, pass: 0, fail: 0, skip: 0, na: 0, jump: 0 };

    (testCases ?? []).forEach((tc) => {
      agg.total += Number(tc?.totalStepCount ?? 0) || 0;
      agg.pass += Number(tc?.passStepCount ?? 0) || 0;
      agg.fail += Number(tc?.failStepCount ?? 0) || 0;
      agg.skip += Number(tc?.skipStepCount ?? 0) || 0;
      agg.na += Number(tc?.naStepCount ?? 0) || 0;
      agg.jump += Number(tc?.jumpStepCount ?? 0) || 0;
    });

    return agg;
  }, [testCases]);

  // 스텝 기준 성공률
  const passRate = useMemo(() => {
    if (!stepStats.total) return null;
    return Math.round((stepStats.pass / stepStats.total) * 100);
  }, [stepStats]);

  // 총 실행 시간 (start/end 차이)
  const totalDurationMs = useMemo(() => {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    const diff = e - s;
    if (Number.isNaN(diff) || diff < 0) return null;
    return diff;
  }, [start, end]);

  // 실행 로그 토글 상태
  const [logOpen, setLogOpen] = useState(false);
  const toggleLogOpen = () => setLogOpen((prev) => !prev);

  // 총평(코멘트) 상태
  const [comment, setComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  // run 이 로드되거나 변경될 때 comment 초기값/동기화
  useEffect(() => {
    if (run && typeof run.comment === "string") setComment(run.comment);
    else setComment("");
  }, [run]);

  // ✅ 코멘트 저장: 빈 문자열도 저장 가능(=코멘트 삭제/초기화)
  const handleSaveComment = async () => {
    if (!run?.id) return;

    try {
      setSavingComment(true);
      await updateScenarioTestRunComment(Number(run.id), {
        comment: (comment ?? "").trim(),
      });
      showSuccess("총평이 저장되었습니다.");
    } catch (e) {
      showError(toErrorMessage(e));
    } finally {
      setSavingComment(false);
    }
  };

  // 전체 실행 결과 하이라이트 배너용 스타일
  let heroBgClass =
    "bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-700";
  let heroIconBgClass =
    "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300";
  let heroTextClass = "text-slate-900 dark:text-slate-100";
  let heroStatusLabel = "실행 완료";

  if (runResult === "PASS") {
    heroBgClass =
      "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700";
    heroIconBgClass =
      "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200";
    heroTextClass = "text-emerald-900 dark:text-emerald-100";
    heroStatusLabel = "PASS";
  } else if (runResult === "FAIL") {
    heroBgClass =
      "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-700";
    heroIconBgClass =
      "bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-200";
    heroTextClass = "text-rose-900 dark:text-rose-100";
    heroStatusLabel = "FAIL";
  }

  return (
    <>
      <div className="flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-sm">
        {/* 상단 헤더 */}
        <PageHeader
          title="테스트 실행 상세"
          subtitle="단일 시나리오 실행 결과를 확인하고 관리합니다."
          extra={
            run && (
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  실행 ID
                </span>
                <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                  #{run.id}
                </span>
                <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
                <ResultBadge result={runResult} />
              </div>
            )
          }
        />

        {/* 로딩 상태 */}
        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-8">
            <div className="animate-pulse flex flex-col gap-6">
              <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded w-1/3" />
              <div className="grid grid-cols-3 gap-6">
                <div className="h-24 bg-gray-100 dark:bg-gray-700 rounded" />
                <div className="h-24 bg-gray-100 dark:bg-gray-700 rounded" />
                <div className="h-24 bg-gray-100 dark:bg-gray-700 rounded" />
              </div>
              <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded" />
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {!loading && error && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-rose-200 dark:border-rose-900 p-6 flex items-start gap-4">
            <span className="material-symbols-outlined text-rose-500 text-3xl">
              error
            </span>
            <div>
              <h3 className="text-lg font-semibold text-rose-600 dark:text-rose-400">
                실행 결과를 불러오지 못했습니다
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mt-1">{error}</p>
              <Link
                to="/test-results"
                className="inline-flex items-center gap-1.5 mt-3 text-xs text-blue-600 dark:text-blue-300 hover:underline"
              >
                <span className="material-symbols-outlined text-sm">
                  arrow_back
                </span>
                결과 목록으로 돌아가기
              </Link>
            </div>
          </div>
        )}

        {/* 데이터 없음 */}
        {!loading && !error && !run && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-10 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-gray-400">
                error
              </span>
            </div>
            <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
              실행 정보를 찾을 수 없습니다.
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              URL을 다시 확인하거나, 테스트 결과 목록에서 다시 진입해 주세요.
            </div>
            <Link
              to="/test-results"
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <span className="material-symbols-outlined text-sm">
                arrow_back
              </span>
              목록으로 돌아가기
            </Link>
          </div>
        )}

        {/* 정상 데이터 렌더링 */}
        {!loading && !error && run && (
          <>
            {/* 전체 실행 결과 하이라이트 배너 */}
            <div
              className={`rounded-2xl border shadow-sm px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${heroBgClass}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center ${heroIconBgClass}`}
                >
                  <span className="material-symbols-outlined text-2xl">
                    {runResult === "PASS"
                      ? "check_circle"
                      : runResult === "FAIL"
                        ? "cancel"
                        : "info"}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    전체 실행 결과
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={`text-xl font-bold ${heroTextClass}`}>
                      {heroStatusLabel}
                    </span>
                    <ResultBadge result={runResult} />
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    테스트케이스 {tcStats.total}개 / 스텝 {stepStats.total}개 기준
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-xs">
                {passRate != null && (
                  <div className="flex flex-col items-start">
                    <span className="text-gray-500 dark:text-gray-400">
                      스텝 기준 성공률
                    </span>
                    <span className="mt-0.5 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {passRate}%
                    </span>
                  </div>
                )}
                {totalDurationMs != null && (
                  <div className="flex flex-col items-start">
                    <span className="text-gray-500 dark:text-gray-400">
                      총 실행 시간
                    </span>
                    <span className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatMs(totalDurationMs)}
                    </span>
                  </div>
                )}
                <div className="flex flex-col items-start">
                  <span className="text-gray-500 dark:text-gray-400">
                    실행 트리거
                  </span>
                  <span className="mt-0.5 text-xs font-mono text-gray-700 dark:text-gray-300">
                    {runTriggerType}
                  </span>
                </div>
              </div>
            </div>

            {/* 실행 정보 / 결과 요약 / 하단 영역 */}
            <div className="flex flex-col gap-6">
              {/* 1) 실행 정보 + 에러 카드 */}
              <div className="flex flex-col gap-6">
                {/* 실행 정보 카드 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <span className="material-symbols-outlined text-gray-400">
                        info
                      </span>
                      실행 정보
                    </h2>
                    <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {runTriggerType}
                    </span>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">
                        테스트
                      </label>
                      <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                        {testName}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {testCode}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">
                        시나리오
                      </label>
                      <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                        {scenarioName}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {scenarioCode}
                      </div>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-700 col-span-full" />

                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">
                        디바이스 / OS
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400">
                          smartphone
                        </span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {deviceName}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 pl-6">
                        {deviceOs} | {udid}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">
                        앱 정보
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400">
                          apps
                        </span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {appName}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 pl-6">
                        {platform}
                      </div>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-700 col-span-full" />

                    <div className="col-span-full grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">
                          시작 시각
                        </label>
                        <div className="text-sm font-mono text-gray-700 dark:text-gray-300">
                          {fmtDT(start)}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">
                          종료 시각
                        </label>
                        <div className="text-sm font-mono text-gray-700 dark:text-gray-300">
                          {fmtDT(end)}
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-gray-700 col-span-full" />

                    <div className="col-span-full grid grid-cols-2 gap-4 items-center">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>테스트케이스 {tcStats.total}개</span>
                        <span className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
                        <span>PASS {tcStats.pass}</span>
                        <span>FAIL {tcStats.fail}</span>
                        <span>SKIP {tcStats.skip}</span>
                        <span>N/A {tcStats.na}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 에러 메시지 */}
                {errorMessage && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700  p-5">
                    <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-lg">
                        warning
                      </span>
                      에러 메시지
                    </h3>
                    <pre className="p-3 rounded bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-200 text-xs font-mono whitespace-pre-wrap break-words border border-rose-100 dark:border-rose-900/30">
                      {errorMessage}
                    </pre>
                  </div>
                )}
              </div>

              {/* 2) 결과 요약 */}
              <ResultSummaryPanel
                start={start}
                end={end}
                totalDurationMs={totalDurationMs}
                stepStats={stepStats}
                tcStats={tcStats}
              />

              {/* 3) 테스트케이스 테이블 + 실행 로그 + 총평 */}
              <div className="flex flex-col gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-400">
                      list_alt
                    </span>
                    테스트케이스 결과
                  </h3>
                  <TestCaseResultTable
                    runId={run.id}
                    block={testCaseBlock}
                    testName={testName}
                    deviceName={deviceName}
                    udid={udid}
                    onOpenEvidence={(images) =>
                      setEvidencePreview({ open: true, images })
                    }
                    onClickCreateJira={openJiraCreateModal}
                    onClickFailCode={handleOpenFailCodeModal}
                  />
                </div>

                {/* 실행 로그 토글 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-gray-400">
                        article
                      </span>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        실행 기록
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={toggleLogOpen}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {logOpen ? "expand_less" : "expand_more"}
                      </span>
                      <span>{logOpen ? "접기" : "펼치기"}</span>
                    </button>
                  </div>
                  {logOpen && (
                    <div className="p-6">
                      <RunReportPanel
                        testName={testName}
                        runId={run.id}
                        live={false}
                        resultLog={resultLog}
                      />
                    </div>
                  )}
                </div>

                {/* 총평 */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-gray-400">
                        rate_review
                      </span>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        이 실행에 대한 총평
                      </h3>
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      QA 메모, 재현 팁 등을 자유롭게 남겨주세요.
                    </span>
                  </div>

                  <textarea
                    className="w-full min-h-[120px] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
                    placeholder="예) 3번째 테스트케이스에서 데이터 초기화가 부족해 FAIL 발생. 다음 빌드에서 API 응답 구조 변경 여부 확인 필요."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />

                  <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <span>{comment.length} 자 입력됨</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-[11px] hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => setComment("")}
                        disabled={savingComment}
                      >
                        초기화
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveComment}
                        disabled={savingComment}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>{savingComment ? "저장 중..." : "저장"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
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
        onClose={closeJiraModal}
        onSubmit={submitJiraCreate}
        onReset={resetJiraToDefault}
      />

      {/* 증거(스크린샷) 미리보기 모달 */}
      <EvidenceModal
        open={evidencePreview.open}
        images={evidencePreview.images}
        onClose={() => setEvidencePreview({ open: false, images: [] })}
      />

      {/* 실패 코드 선택 / 수정 모달 */}
      <FailCodeModal
        open={failCodeModal.open}
        currentFailCode={failCodeModal.currentFailCode}
        currentFailComment={failCodeModal.currentFailComment}
        targetInfo={failCodeModal.targetInfo}
        onClose={handleCloseFailCodeModal}
        onSave={handleSaveFailMeta}
      />
    </>
  );
}