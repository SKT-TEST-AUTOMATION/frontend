// src/features/dashboard/hooks/useHeatmapData.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getScenarioTestHeatMap, getScenarioTestRunsAtDate } from '../../../services/dashboardAPI.js';
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


function pick(obj, keys, fallback = null) {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return fallback;
}

function toMs(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const s = Date.parse(startIso);
  const e = Date.parse(endIso);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
  return Math.max(0, e - s);
}

function toHHMMSS(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function mapRunDtoToUi(run, index) {
  const id =
    pick(run, ["id"], null) ??
    `${index + 1}`;

  const startIso = pick(run, ["startTime"], null);
  const endIso = pick(run, ["endTime"], null);

  const result = pick(run, ["runResult"], null);

  const totalSteps = pick(run, ["totalSteps", "stepCount", "totalStepCount"], null);

  const durationMs =
    pick(run, ["durationMs", "elapsedMs"], null) ?? toMs(startIso, endIso);

  return {
    id,
    timestamp: toHHMMSS(startIso),
    startedAt: startIso,
    endedAt: endIso,
    durationMs,
    result,
    totalSteps,
    raw: run,
  };
}

/**
 * FE에서는 "Test" 용어로 통일
 * - selectedTestIds: UI 체크 상태
 * - testOptions: 드롭다운 옵션 목록(체크 해제해도 사라지지 않게 유지)
 * - API 파라미터는 서버가 scenarioTestIds를 쓰고 있으므로 변환만 해서 보냄
 */
export function useHeatmapData(options = {}) {
  const {
    defaultStartDate,
    defaultEndDate,
    defaultSelectedTestIds = [],
    autoLoad = true,
  } = options;

  const today = useMemo(() => new Date(), []);
  const initialStart = defaultStartDate ?? formatYYYYMMDD(addDays(today, -29));
  const initialEnd = defaultEndDate ?? formatYYYYMMDD(today);

  // filters
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [selectedTestIds, setSelectedTestIds] = useState(defaultSelectedTestIds);

  // data/status
  const [heatmap, setHeatmap] = useState(null);
  const [testOptions, setTestOptions] = useState([]); // [{testId, testCode, testName}]
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const abortRef = useRef(null);

  // selection
  const [selectedCell, setSelectedCell] = useState(null);

  // 상세 패널
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErrorMessage, setDetailErrorMessage] = useState("");
  const [detailRuns, setDetailRuns] = useState([]);

  const detailAbortRef = useRef(null);

  const loadCellDetail = useCallback(async (cell) => {
    const totalCount =
      pick(cell, ["totalTestCount", "totalCount", "count", "total"], null);

    if (!cell?.testId || !cell?.date || totalCount === 0) {
      // 이전 요청 취소
      if (detailAbortRef.current) detailAbortRef.current.abort();
      detailAbortRef.current = null;

      setDetailRuns([]);
      setDetailErrorMessage("");
      setDetailLoading(false);
      return;
    }

    // 이전 요청 취소
    if (detailAbortRef.current) detailAbortRef.current.abort();
    const ac = new AbortController();
    detailAbortRef.current = ac;

    setDetailLoading(true);
    setDetailErrorMessage("");

    try {
      const data = await getScenarioTestRunsAtDate(
        cell.testId,
        { targetDate: cell.date },
        ac.signal
      );

      const list = Array.isArray(data) ? data : (data?.items ?? data?.runs ?? []);
      const mapped = (list ?? []).map(mapRunDtoToUi);

      setDetailRuns(mapped);
      setDetailLoading(false);
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
      setDetailRuns([]);
      setDetailErrorMessage(toErrorMessage(err));
      setDetailLoading(false);
    }
  }, []);

  // 셀 선택이 바뀌면 자동으로 상세 로딩
  useEffect(() => {
    if (!selectedCell) {
      setDetailRuns([]);
      setDetailErrorMessage("");
      setDetailLoading(false);
      return;
    }
    loadCellDetail(selectedCell);
  }, [selectedCell, loadCellDetail]);

  const reloadSelectedCellDetail = useCallback(() => {
    if (selectedCell) loadCellDetail(selectedCell);
  }, [selectedCell, loadCellDetail]);

  // 자동 전체선택이 사용자 선택을 덮어쓰지 않게
  const didAutoInitRef = useRef(false);
  const userTouchedRef = useRef(false);

  const mergeTestOptions = useCallback((rows = []) => {
    // rows: 서버 heatmap.tests (scenarioTestId, testCode, testName)
    const incoming = rows.map((r) => ({
      testId: r.scenarioTestId ?? r.testId, // 혹시 서버 필드명이 바뀌면 대응
      testCode: r.testCode ?? r.testCode,
      testName: r.testName ?? r.testName,
    }));

    setTestOptions((prev) => {
      const map = new Map(prev.map((x) => [x.testId, x]));
      for (const t of incoming) {
        if (t?.testId == null) continue;
        if (!map.has(t.testId)) map.set(t.testId, t);
        else {
          // 메타 업데이트(코드/명칭이 새로 생긴 경우)
          const old = map.get(t.testId);
          map.set(t.testId, {
            ...old,
            testCode: old.testCode ?? t.testCode ?? null,
            testName: old.testName ?? t.testName ?? "",
          });
        }
      }
      return Array.from(map.values());
    });
  }, []);

  const load = useCallback(
    async (override = {}) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const nextStartDate = override.startDate ?? startDate;
      const nextEndDate = override.endDate ?? endDate;
      const nextSelectedTestIds = override.selectedTestIds ?? selectedTestIds;

      setLoading(true);
      setErrorMessage("");

      try {
        const params = {
          startDate: nextStartDate,
          endDate: nextEndDate,

          // 서버 파라미터명은 유지(ScenarioTestIds), FE에서는 TestIds
          ...(nextSelectedTestIds?.length
            ? { scenarioTestIds: nextSelectedTestIds }
            : {}),
        };

        const data = await getScenarioTestHeatMap(params, controller.signal);
        setHeatmap(data);
        setInitialized(true);

        // 옵션 목록은 "현재 응답"에서 계속 누적/유지 (체크 해제해도 목록이 사라지지 않도록)
        mergeTestOptions(data?.tests ?? []);

        // 최초 1회: 사용자가 아직 건드리지 않았고, 선택이 비어있으면 전체 자동 선택
        if (!userTouchedRef.current && !didAutoInitRef.current) {
          const idsFromThisResponse = (data?.tests ?? [])
            .map((t) => t.scenarioTestId)
            .filter((v) => v != null);

          if ((nextSelectedTestIds?.length ?? 0) === 0 && idsFromThisResponse.length > 0) {
            setSelectedTestIds(idsFromThisResponse);
          }
          didAutoInitRef.current = true;
        }

        return data;
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
    [startDate, endDate, selectedTestIds, mergeTestOptions]
  );

  const setRange = useCallback(
    (nextStart, nextEnd, { auto = true } = {}) => {
      setStartDate(nextStart);
      setEndDate(nextEnd);
      if (auto) load({ startDate: nextStart, endDate: nextEnd });
    },
    [load]
  );

  const setTestFilter = useCallback((nextIds, { auto = true } = {}) => {
    userTouchedRef.current = true;
    setSelectedTestIds(nextIds);
    if (auto) load({ selectedTestIds: nextIds });
  }, [load]);

  const setLast7Days = useCallback(({ auto = true } = {}) => {
    const end = new Date();
    const start = addDays(end, -6);
    setRange(formatYYYYMMDD(start), formatYYYYMMDD(end), { auto });
  }, [setRange]);

  const setLast30Days = useCallback(({ auto = true } = {}) => {
    const end = new Date();
    const start = addDays(end, -29);
    setRange(formatYYYYMMDD(start), formatYYYYMMDD(end), { auto });
  }, [setRange]);



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
    testOptions,

    // status
    loading,
    initialized,
    errorMessage,

    // filters
    startDate,
    endDate,
    selectedTestIds,

    // actions
    load,
    setRange,
    setTestFilter,
    setLast7Days,
    setLast30Days,

    // selection
    selectedCell,
    setSelectedCell,

    // detail
    detailLoading,
    detailErrorMessage,
    detailRuns,
    reloadSelectedCellDetail
  };
}