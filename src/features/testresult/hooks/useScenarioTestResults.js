// src/features/testresult/hooks/useScenarioTestResults.js
import { useCallback, useEffect, useState } from "react";
import { normalizePage, toErrorMessage } from "../../../services/axios";
import { getScenarioTestResults } from "../../../services/scenarioAPI";
import { REQUEST_CANCELED_CODE } from "../../../constants/errors";
import { useToast } from '../../../shared/hooks/useToast.js';

/**
 * filters 예:
 * {
 *   scenarioTestCode: string,
 *   scenarioCode: string,
 *   runTriggerType: "MANUAL" | "SCHEDULED" | "" | null,
 *   startTimeFrom: "2025-11-01",
 *   startTimeTo: "2025-11-30"
 * }
 */
export function useScenarioTestResults(
  initialPage = 1,
  initialSize = 10,
  initialFilter = {}
) {
  const { showError } = useToast();
  const [page, setPage] = useState(initialPage); // 1-based UI
  const [size, setSize] = useState(initialSize);

  const [filter, setFilter] = useState(initialFilter);

  const [data, setData] = useState({
    content: [],
    totalElements: 0,
    totalPages: 1,
    number: 0,
    size: initialSize,
  });

  const [rows, setRows] = useState( []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 필터 적용(검색 버튼 눌렀을 때 호출)
  const applyFilter = useCallback((nextFilter) => {
    setPage(1);             // 검색 시 항상 첫 페이지로
    setFilter(nextFilter);  // 의존성이 바뀌면서 자동으로 fetch
  }, []);

  const fetchResults = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        // 필터 → API 파라미터로 매핑
        const params = {
          page: page - 1,
          size,
          sort: "id,desc",
        };

        if (filter.scenarioTestCode) {
          params.scenarioTestCode = filter.scenarioTestCode.trim();
        }
        if (filter.scenarioCode) {
          params.scenarioCode = filter.scenarioCode.trim();
        }
        if (filter.runTriggerType) {
          params.runTriggerType = filter.runTriggerType; // MANUAL / SCHEDULED 등
        }
        if (filter.startTimeFrom) {
          params.startTimeFrom = filter.startTimeFrom; // LocalDate (YYYY-MM-DD)
        }
        if (filter.startTimeTo) {
          params.startTimeTo = filter.startTimeTo;     // LocalDate (YYYY-MM-DD)
        }

        const res = await getScenarioTestResults(params, signal);
        const normalized = normalizePage(res);
        setData(normalized);
        setRows(normalized.content);
      } catch (err) {
        if (err?.code === REQUEST_CANCELED_CODE) return;
        const detailMessage = toErrorMessage(err);
        showError("불러오기에 실패했습니다.", detailMessage);
      } finally {
        setLoading(false);
      }
    },
    [page, size, filter]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchResults(controller.signal);
    return () => controller.abort();
  }, [fetchResults]);

  return {
    page,
    size,
    setPage,
    setSize,
    data,
    rows,
    loading,
    error,
    filter,       // 현재 적용된 필터
    applyFilter,  // 새로운 필터 적용(검색)
  };
}