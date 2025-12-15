// src/features/results/hooks/useScenarioTestCaseResults.js
import { useCallback, useState } from "react";
import { toErrorMessage } from "../../../services/axios";
import { getScenarioTestCaseResults } from "../../../services/runAPI";

export function useScenarioTestCaseResults() {
  const [expandedId, setExpandedId] = useState(null);
  const [tcMap, setTcMap] = useState({});

  const fetchRunCases = useCallback(async (runId) => {
    setTcMap((prev) => ({
      ...prev,
      [runId]: { loading: true, error: null, rows: prev?.[runId]?.rows ?? [] },
    }));

    try {
      const res = await getScenarioTestCaseResults(runId);
      const rows = Array.isArray(res) ? res : res?.content || [];
      setTcMap((prev) => ({
        ...prev,
        [runId]: { loading: false, error: null, rows },
      }));
      return rows;
    } catch (err) {
      setTcMap((prev) => ({
        ...prev,
        [runId]: {
          loading: false,
          error: toErrorMessage(err),
          rows: [],
        },
      }));
      throw err;
    }
  }, []);

  const toggleExpand = useCallback(
    async (runId) => {
      setExpandedId((prev) => (prev === runId ? null : runId));

      // 펼칠 때 + 아직 데이터가 없을 때만 호출
      const cached = tcMap[runId];
      if (cached || expandedId === runId) return;

      await fetchRunCases(runId);
    },
    [expandedId, tcMap, fetchRunCases]
  );

  //  저장 후 “바로 반영”용: 해당 runId만 다시 조회
  const refetchRunCases = useCallback(
    async (runId) => {
      if (!runId) return;
      return fetchRunCases(runId);
    },
    [fetchRunCases]
  );

  const updateTestCaseIssue = useCallback((runId, testCaseId, issueKey) => {
    setTcMap((prev) => {
      const block = prev[runId];
      if (!block) return prev;

      const nextRows = (block.rows || []).map((r) => {
        const rId = r?.testCaseId ?? r?.id;
        if (rId === testCaseId) return { ...r, issueId: issueKey };
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
    refetchRunCases,
    updateTestCaseIssue,
  };
}