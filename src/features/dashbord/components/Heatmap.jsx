import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Calendar, Filter, CheckSquare, Square, ChevronDown, RefreshCw } from "lucide-react";

function useElementWidth(ref) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0]?.contentRect?.width ?? 0);
      setWidth((prev) => (prev === w ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}

export default function Heatmap({
                                  loading = false,
                                  initialized = false,
                                  errorMessage = "",

                                  heatmap,
                                  startDate,
                                  endDate,

                                  // dropdown 옵션(사라지지 않게 유지)
                                  testOptions = [],

                                  // 체크 상태
                                  selectedTestIds = [],

                                  onChangeRange,
                                  onChangeTestIds,
                                  onQuickLast7,
                                  onQuickLast30,
                                  onReload,

                                  selectedCell,
                                  onCellClick,
                                }) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  // grid 폭 측정용
  const gridWrapRef = useRef(null);
  const wrapWidth = useElementWidth(gridWrapRef);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allDates = heatmap?.dates ?? [];
  const allRows = heatmap?.tests ?? [];

  const filteredDates = useMemo(() => {
    if (!startDate || !endDate) return allDates;
    return allDates.filter((d) => d >= startDate && d <= endDate);
  }, [allDates, startDate, endDate]);

  // 화면에 보여줄 row는 "응답 rows"를 기준으로 하되, 사용자가 선택한 것만 표시
  const visibleRows = useMemo(() => {
    const ids = selectedTestIds ?? [];
    if (ids.length === 0) return [];
    const idSet = new Set(ids);
    return allRows.filter((r) => idSet.has(r.scenarioTestId));
  }, [allRows, selectedTestIds]);

  const toggleTest = useCallback((id) => {
    const prev = selectedTestIds ?? [];
    const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    onChangeTestIds(next);
  }, [selectedTestIds, onChangeTestIds]);

  const toggleAll = useCallback(() => {
    const all = (testOptions ?? []).map((t) => t.testId);
    const isAll = (selectedTestIds?.length ?? 0) === all.length;
    onChangeTestIds(isAll ? [] : all);
  }, [testOptions, selectedTestIds, onChangeTestIds]);

  const fmtMD = (isoDate) => {
    if (!isoDate || isoDate.length < 10) return isoDate;
    return `${isoDate.slice(5, 7)}/${isoDate.slice(8, 10)}`;
  };

  const hasData = !!heatmap && (heatmap.tests?.length ?? 0) > 0;

  // ─────────────────────────────────────────────────────────
  // ✅ “기간 넓으면 최소 셀 크기 + 스크롤”, 좁으면 유연
  // ─────────────────────────────────────────────────────────
  const LABEL_COL_PX = 192; // w-48(대략)
  const MIN_CELL_PX = 26;   // 최소 셀 크기 (정사각형 유지 구간)
  const GAP_PX = 4;         // gap-1(대략 4px)
  const colCount = filteredDates.length;

  const { scrollMode, cellPx, innerMinWidth, gridColsStyle, rowHeightStyle } = useMemo(() => {
    const safeCols = Math.max(1, colCount);
    const available = Math.max(0, wrapWidth - LABEL_COL_PX);

    // “최소 셀”로 몇 칼럼까지 들어갈 수 있는지(경계 깜빡임 방지용으로 이 기준이 안정적입니다)
    const maxColsFit = Math.floor((available + GAP_PX) / (MIN_CELL_PX + GAP_PX));
    const needScroll = safeCols > Math.max(1, maxColsFit);

    if (needScroll) {
      const minW =
        LABEL_COL_PX +
        safeCols * MIN_CELL_PX +
        Math.max(0, safeCols - 1) * GAP_PX;

      return {
        scrollMode: true,
        cellPx: MIN_CELL_PX,
        innerMinWidth: minW,
        gridColsStyle: { gridTemplateColumns: `repeat(${safeCols}, ${MIN_CELL_PX}px)` },
        rowHeightStyle: { height: `${MIN_CELL_PX}px` }, // 정사각형 유지(세로=가로)
      };
    }

    // 좁은 기간: 칼럼 수가 적으니 가로를 유연하게 채우고(정사각형 고집 X)
    return {
      scrollMode: false,
      cellPx: null,
      innerMinWidth: "100%",
      gridColsStyle: { gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))` },
      rowHeightStyle: { height: "32px" }, // 행 높이만 통일
    };
  }, [wrapWidth, colCount]);

  const getCellClass = (status, isSelected) => {
    const ring = isSelected ? "ring-2 ring-blue-600 z-1" : "";
    switch (status) {
      case "REGRESSION":
        return `bg-status-regression text-yellow-900 ${ring}`;
      case "FAIL":
        return `bg-status-fail text-white ${ring}`;
      case "PASS":
        return `bg-status-pass text-white ${ring}`;
      default:
        return `bg-status-empty ${ring}`;
    }
  };

  // ─────────────────────────────────────────────────────────
  // 상태 UI
  // ─────────────────────────────────────────────────────────
  if (!hasData && loading) {
    return (
      <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-5 w-40 bg-slate-100 rounded animate-pulse" />
            <div className="mt-2 h-3 w-24 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="h-8 w-40 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="mt-6 h-40 bg-slate-50 border border-slate-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!hasData && initialized && errorMessage) {
    return (
      <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">테스트 실행 히트맵</h2>
            <p className="text-xs text-slate-500 mt-1">일별 테스트 현황</p>
          </div>
          {onReload && (
            <button
              type="button"
              onClick={onReload}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={14} />
              다시 시도
            </button>
          )}
        </div>

        <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      </div>
    );
  }

  if (!hasData && initialized) {
    return (
      <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">테스트 실행 히트맵</h2>
            <p className="text-xs text-slate-500 mt-1">일별 테스트 현황</p>
          </div>
          {onReload && (
            <button
              type="button"
              onClick={onReload}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={14} />
              새로고침
            </button>
          )}
        </div>

        <div className="mt-6 py-10 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
          표시할 데이터가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">테스트 실행 히트맵</h2>
          <p className="text-xs text-slate-500 mt-1">일별 테스트 현황</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Legend */}
          <div className="flex gap-3 text-xs mr-4 border-r border-slate-200 pr-4 hidden lg:flex">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-status-regression" />
              <span>Regression</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-status-fail" />
              <span>Fail</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-status-pass" />
              <span>Pass</span>
            </div>
          </div>

          {/* Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                isFilterOpen || (testOptions.length !== (selectedTestIds?.length ?? 0))
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-white"
              }`}
            >
              <Filter size={14} />
              <span>테스트 선택</span>
              {testOptions.length !== (selectedTestIds?.length ?? 0) && (
                <span className="ml-1 bg-blue-200 text-blue-800 text-[10px] px-1.5 rounded-full">
                  {selectedTestIds?.length ?? 0}
                </span>
              )}
              <ChevronDown size={12} className={`transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
            </button>

            {isFilterOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-3">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-700">표시할 테스트 선택</span>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-[10px] text-blue-600 hover:underline"
                  >
                    {(selectedTestIds?.length ?? 0) === testOptions.length ? "모두 해제" : "모두 선택"}
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {testOptions.map((t) => {
                    const isChecked = (selectedTestIds ?? []).includes(t.testId);
                    const label = t.testCode ? `${t.testCode} · ${t.testName}` : t.testName;

                    return (
                      <button
                        key={t.testId}
                        type="button"
                        onClick={() => toggleTest(t.testId)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-slate-50 rounded text-left group"
                      >
                        <div className={`text-slate-400 group-hover:text-blue-500 transition-colors ${isChecked ? "text-blue-600" : ""}`}>
                          {isChecked ? <CheckSquare size={14} /> : <Square size={14} />}
                        </div>
                        <span
                          className={`text-xs truncate ${isChecked ? "text-slate-800 font-medium" : "text-slate-500"}`}
                          title={label}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => onQuickLast7?.()}
              className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-white hover:shadow-sm rounded"
            >
              7일
            </button>
            <button
              type="button"
              onClick={() => onQuickLast30?.()}
              className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-white hover:shadow-sm rounded"
            >
              30일
            </button>
          </div>

          {/* 기간 설정 */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 px-2 rounded-lg border border-slate-200 text-sm">
            <Calendar size={14} className="text-slate-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => onChangeRange(e.target.value, endDate)}
              className="bg-transparent border-none text-slate-700 text-xs focus:ring-0 p-0 w-24"
            />
            <span className="text-slate-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onChangeRange(startDate, e.target.value)}
              className="bg-transparent border-none text-slate-700 text-xs focus:ring-0 p-0 w-24"
            />
          </div>

          {onReload && (
            <button
              type="button"
              onClick={onReload}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              새로고침
            </button>
          )}
        </div>
      </div>

      {/* 이 래퍼 폭을 기준으로 "스크롤 모드"를 안정적으로 계산 */}
      <div ref={gridWrapRef} className="overflow-x-auto pb-2">
        <div style={{ minWidth: innerMinWidth }}>
          {/* Header */}
          <div className="flex mb-1">
            <div className="w-48 flex-shrink-0 p-2 text-xs font-semibold text-slate-500">
              테스트 코드 / 명칭
            </div>

            <div className="flex-1 grid gap-1" style={gridColsStyle}>
              {filteredDates.map((d) => (
                <div
                  key={d}
                  className="text-[10px] text-center text-slate-400 font-medium"
                  style={scrollMode ? { width: `${cellPx}px` } : undefined}
                >
                  {fmtMD(d)}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="flex flex-col gap-1 ml-0.5 mr-0.5">
            {visibleRows.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                선택된 테스트가 없습니다.
              </div>
            )}

            {visibleRows.map((t) => {
              const byDate = new Map((t.days ?? []).map((x) => [x.date, x]));

              return (
                <div key={t.scenarioTestId} className="flex items-center">
                  <div className="w-48 flex-shrink-0 pr-4">
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-700 overflow-x-auto whitespace-nowrap pr-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <span title={t.testName}>{t.testCode ?? t.testName}</span>
                      {t.testCode && (
                        <span className="text-slate-400 font-normal text-[10px] shrink-0">
                          {t.testName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 grid gap-1" style={gridColsStyle}>
                    {filteredDates.map((d) => {
                      const day = byDate.get(d) ?? {
                        date: d,
                        status: "EMPTY",
                        totalTestCount: 0,
                        passTestCount: 0,
                        failTestCount: 0,
                      };

                      const isSelected =
                        selectedCell?.testId === (t.scenarioTestId ?? t.testId) &&
                        selectedCell?.date === d;

                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            onCellClick({
                              testId: t.scenarioTestId,
                              testCode: t.testCode ?? null,
                              testName: t.testName,
                              date: d,
                              status: day.status,
                              totalTestCount: day.totalTestCount,
                              passTestCount: day.passTestCount,
                              failTestCount: day.failTestCount,
                            })
                          }
                          className={`
                            w-full rounded-sm flex items-center justify-center text-[10px] font-bold relative
                            ${getCellClass(day.status, isSelected)}
                          `}
                          style={scrollMode ? { width: `${cellPx}px`, height: `${cellPx}px` } : rowHeightStyle}
                          title={`Date: ${d}\nStatus: ${day.status}\nTotal: ${day.totalTestCount}\nFail/Pass: ${day.failTestCount}/${day.passTestCount}`}
                        >
                          {day.status === "REGRESSION" && day.totalTestCount > 0 && (
                            <div className="bg-white/90 px-1 py-0.5 rounded-[2px] shadow-sm flex items-center gap-[1px] leading-none">
                              <span className="text-rose-400 font-extrabold text-[8px]">{day.failTestCount}</span>
                              <span className="text-gray-500 text-[6px]">/</span>
                              <span className="text-emerald-600 font-extrabold text-[8px]">{day.passTestCount}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 하단 미세 로딩 표시 */}
          {hasData && loading && (
            <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-2">
              <RefreshCw size={12} className="animate-spin" />
              데이터를 새로 불러오는 중입니다…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}