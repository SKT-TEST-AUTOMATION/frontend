import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getScenarioTestHeatMap } from "../../../services/dashboardAPI.js";
import { toErrorMessage } from "../../../services/axios";

// 날짜 유틸
function pad2(n) {
  return String(n).padStart(2, "0");
}
function formatYYYYMMDD(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// 서버 응답(raw)을 "Test 기준"으로 정규화
function normalizeHeatmap(raw) {
  if (!raw) return null;

  const dates = raw.dates ?? [];
  const tests = (raw.tests ?? []).map((t) => {
    const testId = t.testId ?? t.scenarioTestId ?? t.id; // 백엔드 필드 호환
    const testCode = t.testCode ?? t.code ?? null;
    const testName = t.testName ?? t.name ?? "";

    const days = (t.days ?? []).map((d) => ({
      date: d.date,
      status: d.status ?? "EMPTY",
      totalTestCount: d.totalTestCount ?? 0,
      passTestCount: d.passTestCount ?? 0,
      failTestCount: d.failTestCount ?? 0,
    }));

    return { testId, testCode, testName, days };
  });

  return {
    startDate: raw.startDate,
    endDate: raw.endDate,
    dates,
    tests,
  };
}

export function useHeatmapData(options = {}) {
  const {
    defaultStartDate,
    defaultEndDate,
    defaultTestIds = [],
    autoLoad = true,
  } = options;

  const today = useMemo(() => new Date(), []);
  const initialStart = defaultStartDate ?? formatYYYYMMDD(addDays(today, -29));
  const initialEnd = defaultEndDate ?? formatYYYYMMDD(today);

  // 기간 필터(서버 재조회 대상)
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);

  // 테스트 선택(UI 필터만, 서버 재조회 X)
  const [selectedTestIds, setSelectedTestIds] = useState(defaultTestIds);

  // 데이터/상태
  const [heatmap, setHeatmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // UI 선택 상태(셀)
  const [selectedCell, setSelectedCell] = useState(null);

  // 요청 취소
  const abortRef = useRef(null);

  // "자동 전체선택"이 사용자의 선택을 덮어쓰지 않도록 제어
  const didAutoInitRef = useRef(false);
  const userTouchedRef = useRef(false);

  const syncSelectedIdsWithHeatmap = useCallback((hm) => {
    const allIds = (hm?.tests ?? []).map((t) => t.testId).filter((v) => v != null);
    const valid = new Set(allIds);

    // 1) 아직 사용자가 건드리지 않았고, 선택이 비어 있으면: 최초 1회 전체 선택
    if (!userTouchedRef.current && !didAutoInitRef.current && (selectedTestIds?.length ?? 0) === 0) {
      setSelectedTestIds(allIds);
      didAutoInitRef.current = true;
      return;
    }

    // 2) 데이터가 바뀌어서 사라진 testId는 선택에서 제거(자연스러운 동작)
    const prev = selectedTestIds ?? [];
    const next = prev.filter((id) => valid.has(id));
    if (next.length !== prev.length) {
      setSelectedTestIds(next);
    }
  }, [selectedTestIds]);

  const load = useCallback(
    async (override = {}) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const nextStartDate = override.startDate ?? startDate;
      const nextEndDate = override.endDate ?? endDate;

      setLoading(true);
      setErrorMessage("");

      try {
        // 서버에는 기간만 전송 (체크박스는 UI 필터)
        const params = { startDate: nextStartDate, endDate: nextEndDate };

        const raw = await getScenarioTestHeatMap(params, controller.signal);
        const normalized = normalizeHeatmap(raw);

        setHeatmap(normalized);
        setInitialized(true);

        // 새 데이터에 맞춰 선택 ID 동기화
        syncSelectedIdsWithHeatmap(normalized);

        return normalized;
      } catch (err) {
        if (err?.code === "ERR_CANCELED") return null;
        setHeatmap(null);
        setInitialized(true);
        setErrorMessage(toErrorMessage(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, syncSelectedIdsWithHeatmap]
  );

  // 기간 변경(서버 재조회)
  const setRange = useCallback(
    (nextStart, nextEnd, { auto = true } = {}) => {
      setStartDate(nextStart);
      setEndDate(nextEnd);
      if (auto) load({ startDate: nextStart, endDate: nextEnd });
    },
    [load]
  );

  // 테스트 선택 변경 (UI만 변경)
  const setTestFilter = useCallback((nextIds) => {
    userTouchedRef.current = true;
    setSelectedTestIds(nextIds);
  }, []);

  // 편의 토글
  const toggleTestId = useCallback((testId) => {
    userTouchedRef.current = true;
    setSelectedTestIds((prev) => {
      const p = prev ?? [];
      return p.includes(testId) ? p.filter((x) => x !== testId) : [...p, testId];
    });
  }, []);

  const toggleAllTests = useCallback(() => {
    userTouchedRef.current = true;
    const all = (heatmap?.tests ?? []).map((t) => t.testId).filter((v) => v != null);
    setSelectedTestIds((prev) => {
      const p = prev ?? [];
      return p.length === all.length ? [] : all;
    });
  }, [heatmap?.tests]);

  // 간편 범위(서버 재조회)
  const setLast7Days = useCallback(
    ({ auto = true } = {}) => {
      const end = new Date();
      const start = addDays(end, -6);
      setRange(formatYYYYMMDD(start), formatYYYYMMDD(end), { auto });
    },
    [setRange]
  );

  const setLast30Days = useCallback(
    ({ auto = true } = {}) => {
      const end = new Date();
      const start = addDays(end, -29);
      setRange(formatYYYYMMDD(start), formatYYYYMMDD(end), { auto });
    },
    [setRange]
  );

  // 자동 로드
  useEffect(() => {
    if (!autoLoad) return;
    load();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [autoLoad, load]);

  return {
    // data
    heatmap,

    // status
    loading,
    initialized,
    errorMessage,

    // filters (server)
    startDate,
    endDate,

    // filters (ui)
    selectedTestIds,

    // actions
    load,
    setRange,
    setLast7Days,
    setLast30Days,

    // ui filter helpers
    setTestFilter,
    toggleTestId,
    toggleAllTests,

    // selection
    selectedCell,
    setSelectedCell,
  };
}