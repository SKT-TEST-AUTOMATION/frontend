// src/features/testresult/hooks/useJiraIssueModal.js
import { useCallback, useState } from "react";
import { toErrorMessage } from "../../../services/axios";
import { useToast } from '../../../shared/hooks/useToast.js';

const SUMMARY_MAX = 255;

const trimSummary = (s) => (s ? String(s).slice(0, SUMMARY_MAX) : "");

/**
 * JIRA description 템플릿 생성
 */
function buildJiraDescription({
                                runId,
                                testCaseId,
                                testCaseCode: testCode,
                                testCaseName: caseName,
                                scenarioTestName,
                                deviceName,
                                deviceUdid,
                                result,
                                logText,
                              }) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const d = now.getDate();

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
}

/**
 * JIRA 이슈 생성 모달을 위한 상태/동작 전용 훅
 * - UI와 네트워크 로직을 분리해서 재사용성 및 테스트 용이성 확보
 */
export function useJiraIssueModal({ onIssueCreated }) {
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
    // context
    testCaseCode: null,
    testCaseName: null,
    scenarioTestName: null,
    logText: null,
    result: null,
  });

  const { showSuccess, showError, showInfo } = useToast();
  const openJiraCreateModal = useCallback(
    (runId, tc, testCode, caseName, scenarioTestName, deviceName, deviceUdid) => {
      const testCaseId = tc?.testCaseId ?? tc?.id ?? null;
      const scenarioTestCaseResultId = tc?.id ?? null;
      const sheet = tc?.sheet ?? tc?.sheetName ?? tc?.sheet_name ?? null;
      const stepNo = tc?.stepNo ?? tc?.step_no ?? null;
      const result = tc?.runResult ?? tc?.result ?? "FAIL";
      const logText = tc?.log ?? tc?.resultLog ?? tc?.logText ?? "-";

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
        testCaseCode: testCode,
        testCaseName: caseName,
        scenarioTestName,
        logText,
        result,
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
      if (!m.runId) return m;
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

  const handleJiraChange = useCallback((field, value) => {
    setJiraModal((m) => ({ ...m, [field]: value }));
  }, []);

  const closeJiraModal = useCallback(() => {
    setJiraModal((m) => ({ ...m, open: false }));
  }, []);

  const submitJiraCreate = useCallback(async () => {
    try {
      setJiraModal((m) => ({ ...m, loading: true }));

      // 최신 상태 snapshot
      const {
        summary,
        description,
        priority,
        labels,
        includeArtifacts,
        runId,
        scenarioTestCaseResultId,
        testCaseId,
        sheet,
        stepNo,
      } = jiraModal;

      const body = {
        summary: trimSummary(summary),
        description,
        priority,
        labels: String(labels || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        includeArtifacts: !!includeArtifacts,
        scenarioTestRunId: runId,
        ScenarioTestCaseResultId: scenarioTestCaseResultId ?? null,
        testCaseId,
        sheet,
        stepNo,
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

      // 상위에 알려주기 (tcMap 업데이트는 상위 책임)
      if (issueKey && typeof onIssueCreated === "function") {
        onIssueCreated(runId, testCaseId, issueKey);
      }

      showSuccess("Jira 이슈 생성을 완료했습니다.");
      setJiraModal((m) => ({ ...m, open: false, loading: false }));
    } catch (e) {
      const detailMessage = toErrorMessage(e);
      showError("Jira 이슈 생성에 실패했습니다.", detailMessage);
      setJiraModal((m) => ({ ...m, loading: false }));
    }
  }, [jiraModal, onIssueCreated]);

  return {
    jiraModal,
    SUMMARY_MAX,
    trimSummary,
    openJiraCreateModal,
    resetJiraToDefault,
    handleJiraChange,
    closeJiraModal,
    submitJiraCreate,
  };
}