// useDashboardData.js

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useToast } from "../../../shared/hooks/useToast";
import { toErrorMessage } from "../../../services/axios";
import {
  getTodayRunsResults,
  getActiveRuns,
  getTodaySchedulesToRun,
} from "../../../services/dashboardAPI";

export function useDashboardData() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);   // ★ 첫 로딩 완료 여부
  const [error, setError] = useState(null);

  const [todayRuns, setTodayRuns] = useState([]);        // 오늘 수행된 테스트
  const [activeRuns, setActiveRuns] = useState([]);      // 현재 실행 중 테스트
  const [todaySchedules, setTodaySchedules] = useState([]); // 오늘 실행 예정 스케줄

  const fetchAll = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);

      try {
        const [runs, active, schedules] = await Promise.all([
          getTodayRunsResults(undefined, signal),
          getActiveRuns(undefined, signal),
          getTodaySchedulesToRun(undefined, signal),
        ]);

        setTodayRuns(runs ?? []);
        setActiveRuns(active ?? []);
        setTodaySchedules(schedules ?? []);
      } catch (err) {
        // AbortController 취소인 경우는 무시
        if (
          axios.isCancel?.(err) ||
          err?.code === "ERR_CANCELED" ||
          err?.name === "CanceledError"
        ) {
          return;
        }
        setError(err);
        toast.error(toErrorMessage(err));
      } finally {
        setLoading(false);
        setInitialized(true);   // ★ 첫 요청이 끝났다는 표시 (성공/실패 상관없이)
      }
    },
    [toast]
  );

  // 마운트 시 1회 자동 호출
  useEffect(() => {
    const controller = new AbortController();
    fetchAll(controller.signal);

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 상단 summary
  const summary = useMemo(() => {
    const completedCount = todayRuns.length;
    const runningCount = activeRuns.length;
    const queuedCount = todaySchedules.length;

    const failedCount = todayRuns.filter(
      (r) => r.runResult === "FAIL" || r.runResult === "ERROR"
    ).length;

    return {
      completedCount,
      runningCount,
      queuedCount,
      failedCount,
    };
  }, [todayRuns, activeRuns, todaySchedules]);

  // 새로고침 시에는 기존 값은 유지한 채로 loading만 true → 패널에서 skeleton만 조정
  const refresh = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    loading,       // 스케줄 패널 로딩 여부 등에 사용
    initialized,   // ★ summary 값 표시용
    error,
    summary,
    todayRuns,
    activeRuns,
    todaySchedules,
    refresh,
  };
}