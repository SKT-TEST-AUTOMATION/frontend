// src/features/testresult/pages/TestResultListPage.jsx
import React, { useState } from "react";
import PageHeader from "../../../shared/components/PageHeader";
import PaginationBar from "../../../shared/components/PaginationBar";
import fmtDT from "../../../shared/utils/dateUtils";
import RunReportPanel from "../../runs/components/RunReportPanel";
import EvidenceModal from "../../runs/components/EvidenceModal.jsx";
import JiraIssueModal from "../../runs/components/JiraIssueModal.jsx";

import { useScenarioTestResults } from "../hooks/useScenarioTestResults";
import {
  useScenarioTestCaseResults,
} from "../hooks/useScenarioTestCaseResults";
import { useJiraIssueModal } from "../hooks/useJiraIssueModal";
import ResultBadge from "../components/ResultBadge";
import TestCaseResultTable from "../components/TestCaseResultTable.jsx";
import TestResultFilterBar from '../components/TestResultFilterBar.jsx';
import FailCodeModal from '../components/FailCodeModal.jsx';
import { useNavigate } from 'react-router-dom';

// TestResultListPage.jsx 상단 부분
const DEFAULT_FILTER = {
  scenarioTestCode: "",
  scenarioCode: "",
  runTriggerType: "",
  startTimeFrom: "",
  startTimeTo: "",
};

export default function TestResultListPage() {
  const navigate = useNavigate();
  const [filterForm, setFilterForm] = useState(DEFAULT_FILTER);

  const [periodError, setPeriodError] = useState("");

  const {
    page,
    size,
    setPage,
    setSize,
    data,
    rows,
    loading,
    error,
    filter,
    applyFilter,
  } = useScenarioTestResults(1, 10, DEFAULT_FILTER);

  const handleSearch = () => {
    const { startTimeFrom, startTimeTo } = filterForm;

    // 1) 시작일 없이 종료일만 있는 경우 막기
    if (!startTimeFrom && startTimeTo) {
      setPeriodError("종료일을 선택하기 전에 시작일을 먼저 선택해 주세요.");
      return;
    }

    // 2) 둘 다 있을 때, 종료일 > 시작일이어야 함
    if (startTimeFrom && startTimeTo) {
      const from = new Date(startTimeFrom);
      const to = new Date(startTimeTo);

      // 같거나 이전이면 에러
      if (to < from) {
        setPeriodError("종료일은 시작일 ‘이후’ 날짜여야 합니다.");
        return;
      }
    }

    setPeriodError("");
    applyFilter(filterForm);
  };

  const handleReset = () => {
    setFilterForm(DEFAULT_FILTER);
    setPeriodError("");
    applyFilter(DEFAULT_FILTER);
  };

  // 2) Run별 테스트케이스 결과 + 확장 상태
  const { expandedId, tcMap, toggleExpand, updateTestCaseIssue } =
    useScenarioTestCaseResults();

  // 3) JIRA 모달 상태/동작 (tcMap 업데이트는 이 훅에서 직접 하지 않고 상위에 위임)
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

  // 4) 증거(스크린샷) 프리뷰 모달
  const [evidencePreview, setEvidencePreview] = useState({
    open: false,
    images: [],
  });

  // 5) 실패 코드 모달 상태
  const [failCodeModal, setFailCodeModal] = useState({
    open: false,
    currentFailCode: null,
    targetInfo : null,
    payload : null,
  })

  // 실패 코드 모달 열기 핸들러
  const handleOpenFailCodeModal = (payload) => {
    setFailCodeModal({
      open: true,
      currentFailCode: payload.failCode ?? null,
      targetInfo: {
        caseCode: payload.caseCode,
        caseName: payload.caseName,
      },
      payload, // 나중에 저장 API 호출 시 사용
    });
  };

  const handleCloseFailCodeModal = () => {
    setFailCodeModal({
      open: false,
      currentFailCode: null,
      targetInfo: null,
      payload: null,
    });
  };

  // 실패 코드 저장 핸들러 (백엔드 업데이트 API는 아직 없으니 TODO로 표시)
  const handleSaveFailCode = async (newCode) => {
    const { payload } = failCodeModal;
    if (!payload) return;

    const { runId, testCaseRow } = payload;

    // TODO: 여기에서 백엔드에 실패 코드 업데이트 API 호출
    // 예시 (실제 API path/파라미터는 구현에 맞게 수정 필요):
    // await updateTestCaseFailCode({
    //   runId,
    //   testCaseResultId: testCaseRow.id,
    //   failCode: newCode,
    // });
    //
    // 그리고 tcMap을 갱신하거나, useScenarioTestCaseResults 훅에
    // updateTestCaseFailCode 같은 updater를 만들어 호출하면 됩니다.

    console.log("save failCode", {
      runId,
      testCaseRow,
      newCode,
    });
  };

  const handleRowClick = (id) => {
    if (!id) return;
    navigate(`/results/${id}/detail`);
  };

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

        <TestResultFilterBar
          value={filterForm}
          onChange={(next) => {
            setFilterForm(next);
            setPeriodError(""); // 값 바꾸면 에러는 일단 초기화
          }}
          onSearch={handleSearch}
          onReset={handleReset}
          periodError={periodError}
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

          {/* 로딩 상태 */}
          {loading && (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-5 py-3.5">
                  {[1, 2, 2, 2, 2, 2, 1].map((span, idx) => (
                    <div key={idx} className={`col-span-${span}`}>
                      <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
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
                const id = r?.id;
                const st = r?.scenarioTest;
                const sc = st?.scenario;

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
                    <div className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                         onClick={() => handleRowClick(id)}>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(id)}
                          }
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
                          <TestCaseResultTable
                            runId={id}
                            block={tcMap[id]}
                            testName={testName}
                            deviceName={deviceName}
                            udid={udid}
                            onOpenEvidence={(images) =>
                              setEvidencePreview({ open: true, images })
                            }
                            onClickCreateJira={openJiraCreateModal}
                            onClickFailCode={handleOpenFailCodeModal}
                          />

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
                              testName={testName}
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
        targetInfo={failCodeModal.targetInfo}
        onClose={handleCloseFailCodeModal}
        onSave={handleSaveFailCode}
      />
    </>
  );
}