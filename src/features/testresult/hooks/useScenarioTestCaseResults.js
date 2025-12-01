// src/features/results/hooks/useScenarioTestCaseResults.js
import { useCallback, useState } from "react";
import { toErrorMessage } from "../../../services/axios";
import { getScenarioTestCaseResults } from "../../../services/runAPI";

/**
 * Run별 TestCase 결과 + 확장 상태 관리 훅
 * - expandedId: 현재 펼쳐진 runId
 * - tcMap: { [runId]: { loading, error, rows } }
 */
export function useScenarioTestCaseResults() {
  const [expandedId, setExpandedId] = useState(null);
  const [tcMap, setTcMap] = useState({});

  const toggleExpand = useCallback(
    async (runId) => {
      setExpandedId((prev) => (prev === runId ? null : runId));

      // 펼칠 때 + 아직 데이터가 없을 때만 호출
      const cached = tcMap[runId];
      if (cached || expandedId === runId) {
        return;
      }

      setTcMap((prev) => ({
        ...prev,
        [runId]: { loading: true, error: null, rows: [] },
      }));

      try {
        const res = await getScenarioTestCaseResults(runId);
        const rows = Array.isArray(res) ? res : res?.content || [];
        setTcMap((prev) => ({
          ...prev,
          [runId]: { loading: false, error: null, rows },
        }));
      } catch (err) {
        setTcMap((prev) => ({
          ...prev,
          [runId]: {
            loading: false,
            error: toErrorMessage(err),
            rows: [],
          },
        }));
      }
    },
    [expandedId, tcMap]
  );

  /**
   * 외부에서 JIRA issueKey 등을 업데이트하기 위한 헬퍼
   */
  const updateTestCaseIssue = useCallback((runId, testCaseId, issueKey) => {
    setTcMap((prev) => {
      const block = prev[runId];
      if (!block) return prev;

      const nextRows = (block.rows || []).map((r) => {
        const rId = r?.testCaseId ?? r?.id;
        if (rId === testCaseId) {
          return { ...r, issueId: issueKey };
        }
        return r;
      });

      return {
        ...prev,
        [runId]: { ...block, rows: nextRows },
      };
    });
  }, []);

  return {
    expandedId,
    tcMap,
    toggleExpand,
    updateTestCaseIssue,
  };
}