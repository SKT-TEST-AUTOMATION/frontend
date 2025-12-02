import React, { useCallback, useEffect, useMemo, useState } from "react";
import { normalizePage, toErrorMessage } from "../../../services/axios";
import { REQUEST_CANCELED_CODE } from "../../../constants/errors";
import PageHeader from "../../../shared/components/PageHeader";
import PaginationBar from "../../../shared/components/PaginationBar";
import { useToast } from "../../../shared/hooks/useToast";
import {
  deleteSchedule,
  getTestSchedules,
  updateScheduleStatus,
} from "../../../services/scheduleAPI";
import { useNavigate } from "react-router-dom";

/**
 * 예상 응답 스키마 (TestScheduleListDto.Response)
 * { id, name, type, status, startDate, endDate, executeTime, deviceUdid, repeatTimes, repeatCount,
 *   scenarioTest: { id, code, testName, appPlatformType, testAppId, running } }
 */

// 오늘 / 지우기 토글이 있는 date input
function TodayToggleDateInput({ id, value, onChange, className = "" }) {
  const hasValue = !!value;

  const handleButtonClick = () => {
    if (hasValue) {
      // 값이 있을 때 → 지우기
      onChange("");
    } else {
      // 값이 없을 때 → 오늘 날짜로 설정
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");
      onChange(`${y}-${m}-${d}`);
    }
  };

  const handleInputChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative">
      <input
        id={id}
        type="date"
        value={value}
        onChange={handleInputChange}
        className={[
          "w-full h-10 pl-3.5 pr-16",
          "bg-white dark:bg-gray-700",
          "border border-gray-300 dark:border-gray-600",
          "rounded-lg text-gray-900 dark:text-gray-100",
          "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          "appearance-none", // 브라우저 기본 아이콘 최소화
          className,
        ].join(" ")}
      />

      <button
        type="button"
        onClick={handleButtonClick}
        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[11px]
                   rounded-md border border-gray-300 dark:border-gray-600
                   bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200
                   hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        {hasValue ? "지우기" : "오늘"}
      </button>
    </div>
  );
}

// 유틸
const TYPE_LABEL = { ONCE: "한 번", DAILY: "매일", WEEKLY: "매주" };
const STATUS_UI = {
  ACTIVE: {
    text: "활성화",
    value: "ACTIVE",
    chip: "bg-green-100 text-green-800",
    canToggle: true,
    checked: true,
  },
  INACTIVE: {
    text: "비활성화",
    value: "INACTIVE",
    chip: "bg-rose-100 text-rose-800",
    canToggle: true,
    checked: false,
  },
  EXPIRED: {
    text: "기간 만료",
    value: "EXPIRED",
    chip: "bg-gray-100 text-gray-800",
    canToggle: false,
    checked: false,
  },
};
const formatDateRange = (s, e) =>
  !s && !e ? "-" : s && !e ? s : !s && e ? e : `${s} ~ ${e}`;
const formatTimeHHmm = (t) => t || "--:--";

// 공통 컬럼 템플릿(총 10열)
const GRID_COLS =
  "grid grid-cols-[28px_96px_minmax(160px,1fr)_minmax(160px,1fr)_84px_100px_minmax(260px,1fr)_96px_96px_120px]";
const TABLE_MIN_WIDTH = "min-w-[1360px]";
const CELL_BASE = "flex items-center h-12 leading-[1.15]";
const CELL_NUM = `${CELL_BASE} tabular-nums`;

export default function TestScheduleListPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  // 목록/페이지 상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [meta, setMeta] = useState({ totalPages: 1, totalElements: 0 });

  // 필터 상태
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [targetDate, setTargetDate] = useState("");

  // 선택 상태
  const [selectedIds, setSelectedIds] = useState(new Set());
  const allChecked = useMemo(
    () => rows.length > 0 && rows.every((r) => selectedIds.has(r.id)),
    [rows, selectedIds],
  );
  const toggleAll = () =>
    setSelectedIds((prev) => {
      if (rows.length === 0) return prev;
      const every = rows.every((r) => prev.has(r.id));
      if (every) return new Set();
      const n = new Set(prev);
      rows.forEach((r) => n.add(r.id));
      return n;
    });

  // 목록 조회
  const fetchList = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await getTestSchedules(
          { page: page - 1, size, sort: "id,desc", q, status, targetDate },
          signal,
        );
        const data = normalizePage(res);
        setRows(data.content ?? []);
        setMeta({
          totalPages: data.totalPages ?? 1,
          totalElements:
            data.totalElements ?? (data.content?.length ?? 0),
        });
        setSelectedIds(new Set());
      } catch (e) {
        if (e?.code !== REQUEST_CANCELED_CODE)
          setError(toErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [page, size, q, status, targetDate],
  );

  useEffect(() => {
    const c = new AbortController();
    fetchList(c.signal);
    return () => c.abort();
  }, [fetchList]);

  // 일괄/토글
  const bulkDisable = async () => {
    if (selectedIds.size === 0)
      return showToast("info", "선택된 스케줄이 없습니다.");
    try {
      showToast(
        "success",
        "일괄 비활성화 요청이 처리되었습니다. (API 연결 필요)",
      );
      fetchList(new AbortController().signal);
    } catch {
      showToast("error", "일괄 비활성화 실패");
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0)
      return showToast("info", "선택된 스케줄이 없습니다.");
    if (!confirm("선택한 스케줄을 삭제하시겠습니까?")) return;
    try {
      showToast(
        "success",
        "일괄 삭제 요청이 처리되었습니다. (API 연결 필요)",
      );
      fetchList(new AbortController().signal);
    } catch {
      showToast("error", "일괄 삭제 실패");
    }
  };

  const onToggle = async (row) => {
    const info = STATUS_UI[row.status] ?? STATUS_UI.INACTIVE;
    if (!info.canToggle) return;
    const nextEnable = !info.checked;
    const nextStatus = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await updateScheduleStatus(row.id, nextStatus);
      showToast(
        "success",
        `스케줄이 ${
          nextEnable ? "활성화" : "비활성화"
        } 되었습니다.`,
      );
      fetchList(new AbortController().signal);
    } catch {
      showToast("error", "상태 변경 실패");
    }
  };

  const onDelete = async (row) => {
    if (window.confirm("이 스케줄을 삭제하시겠습니까?")) {
      try {
        await deleteSchedule(row.id);
        showToast("success", "삭제 처리 되었습니다.");
        fetchList(new AbortController().signal);
      } catch (e) {
        console.log(e);
        showToast("error", "삭제에 실패했습니다.");
      }
    }
  };

  const refresh = () => fetchList(new AbortController().signal);
  const filteredRows = rows;

  const onScheduleClick = (id) => {
    if (!id) return;
    navigate(`/runs/batches/${id}`);
  };

  // 🔹 기준일: 오늘 버튼
  const handleTodayClick = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    setTargetDate(`${y}-${m}-${d}`);
  };

  // 🔹 필터 초기화
  const handleResetFilters = () => {
    setQ("");
    setStatus("");
    setTargetDate("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-sm">
      <PageHeader
        title="테스트 배치 현황"
        subtitle="등록된 배치 스케줄 현황을 확인하고, 실행 상태를 제어할 수 있습니다."
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
        {/* 1행: 검색 */}
        <div className="grid grid-cols-1 gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-base">
              search
            </span>
            <label htmlFor="schedule-search" className="sr-only">
              배치 스케줄 검색
            </label>
            <input
              id="schedule-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="테스트 코드, 테스트 이름, 스케줄 이름으로 검색"
              className="w-full h-10 pl-10 pr-3.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 2행: 상태 / 기준일 / 필터 초기화 */}
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          {/* 상태 */}
          <div className="sm:w-1/3 min-w-[220px]">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
              상태
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100"
            >
              <option value="">상태 전체</option>
              <option value="ACTIVE">활성화</option>
              <option value="INACTIVE">비활성화</option>
              <option value="EXPIRED">기간 만료</option>
            </select>
          </div>

          {/* 기준일 */}
          <div className="sm:flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                기준일
              </span>
            </div>

            <TodayToggleDateInput
              id="target-date"
              value={targetDate}
              onChange={setTargetDate}
            />
          </div>

          {/* 필터 초기화 */}
          <div className="sm:w-auto sm:flex sm:justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-xs"
            >
              <span className="material-symbols-outlined text-[16px]">
                restart_alt
              </span>
              필터 초기화
            </button>
          </div>
        </div>
        {/* 하단 오른쪽: 일괄 버튼들 */}
        {/*<div className="mt-3 flex items-center justify-end gap-2">*/}
        {/*  <button*/}
        {/*    onClick={bulkDisable}*/}
        {/*    disabled={selectedIds.size === 0}*/}
        {/*    className={[*/}
        {/*      "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg",*/}
        {/*      "border border-amber-300 text-amber-700 dark:text-amber-300",*/}
        {/*      "bg-amber-50/60 dark:bg-amber-900/20",*/}
        {/*      "hover:bg-amber-100 dark:hover:bg-amber-900/30",*/}
        {/*      "focus:outline-none focus:ring-2 focus:ring-amber-300/60",*/}
        {/*      "disabled:opacity-50 disabled:cursor-not-allowed"*/}
        {/*    ].join(" ")}*/}
        {/*    title={selectedIds.size ? "" : "선택된 스케줄이 없습니다"}*/}
        {/*  >*/}
        {/*    <span className="material-symbols-outlined text-[18px]">pause_circle</span>*/}
        {/*    일괄 비활성화*/}
        {/*  </button>*/}

        {/*  <button*/}
        {/*    onClick={bulkDelete}*/}
        {/*    disabled={selectedIds.size === 0}*/}
        {/*    className={[*/}
        {/*      "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg",*/}
        {/*      "border border-rose-300 text-rose-700 dark:text-rose-300",*/}
        {/*      "bg-rose-50/60 dark:bg-rose-900/20",*/}
        {/*      "hover:bg-rose-100 dark:hover:bg-rose-900/30",*/}
        {/*      "focus:outline-none focus:ring-2 focus:ring-rose-300/60",*/}
        {/*      "disabled:opacity-50 disabled:cursor-not-allowed"*/}
        {/*    ].join(" ")}*/}
        {/*    title={selectedIds.size ? "" : "선택된 스케줄이 없습니다"}*/}
        {/*  >*/}
        {/*    <span className="material-symbols-outlined text-[18px]">delete</span>*/}
        {/*    일괄 삭제*/}
        {/*  </button>*/}
        {/*</div>*/}
      </div>

      {/* 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50">
        <div className="overflow-x-auto">
          <div className={`${TABLE_MIN_WIDTH}`}>
            {/* 헤더 */}
            <div
              className={`${GRID_COLS} gap-4 pl-2 pr-5 py-2.5 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700`}
            >
              <div className={`${CELL_BASE} justify-center`}>
                <input
                  type="checkbox"
                  checked={
                    filteredRows.length > 0 &&
                    filteredRows.every((r) => selectedIds.has(r.id))
                  }
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className={`${CELL_BASE} text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase`}>
                테스트 코드
              </div>
              <div className={`${CELL_BASE} text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase`}>
                테스트 이름
              </div>
              <div className={`${CELL_BASE} text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase`}>
                스케줄 이름
              </div>
              <div className={`${CELL_BASE} text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase`}>
                반복 주기
              </div>
              <div className={`${CELL_BASE} text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase`}>
                실행 시간
              </div>
              <div className={`${CELL_BASE} text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase`}>
                실행 기간
              </div>
              <div className={`${CELL_BASE} text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase`}>
                상태
              </div>
              <div className={`${CELL_BASE} text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase`}>
                ON/OFF
              </div>
              <div className={`${CELL_BASE} text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase`}>
                액션
              </div>
            </div>

            {/* 로딩 */}
            {loading && (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`${GRID_COLS} gap-4 pl-2 pr-5 py-2.5`}
                  >
                    {Array.from({ length: 10 }).map((__, j) => (
                      <div key={j} className={`${CELL_BASE}`}>
                        <div className="w-full h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
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

            {/* 비어있음 */}
            {!loading && !error && filteredRows.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 text-sm">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3.5">
                  <span className="material-symbols-outlined text-gray-400 text-xl">
                    list_alt
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
                  데이터가 없습니다
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                  필터를 조정해 보세요.
                </p>
              </div>
            )}

            {/* 바디 */}
            {!loading && !error && filteredRows.length > 0 && (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRows.map((r) => {
                  const scenarioCode = r?.scenarioTestCode ?? "-";
                  const testName = r?.scenarioTestName ?? "-";
                  const scheduleName = r?.name ?? "-";
                  const typeLabel =
                    TYPE_LABEL[r?.type] ?? r?.type ?? "-";
                  const timeLabel = formatTimeHHmm(r?.executeTime);
                  const rangeLabel = formatDateRange(
                    r?.startDate,
                    r?.endDate,
                  );
                  const statusUi =
                    STATUS_UI[r?.status] ?? STATUS_UI.INACTIVE;

                  return (
                    <div
                      key={r.id}
                      className={`${GRID_COLS} gap-4 pl-2 pr-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
                    >
                      {/* 체크 */}
                      <div className={`${CELL_BASE} justify-center`}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.id)}
                          onChange={() => {
                            const id = r.id;
                            setSelectedIds((prev) => {
                              const n = new Set(prev);
                              n.has(id) ? n.delete(id) : n.add(id);
                              return n;
                            });
                          }}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </div>

                      {/* 테스트 코드 (말줄임표 + title) */}
                      <div className={`${CELL_BASE} min-w-0`}>
                        <div
                          className="font-medium text-gray-900 dark:text-gray-100 truncate"
                          title={scenarioCode}
                        >
                          {scenarioCode}
                        </div>
                      </div>

                      {/* 테스트 이름 (말줄임표 + title) */}
                      <div className={`${CELL_BASE} min-w-0`}>
                        <div
                          className="text-gray-800 dark:text-gray-200 truncate"
                          title={testName}
                        >
                          {testName}
                        </div>
                      </div>

                      {/* 스케줄 이름 (말줄임표 + title) */}
                      <div
                        className={`${CELL_BASE} min-w-0 cursor-pointer`}
                        onClick={() => {
                          onScheduleClick(r.id);
                        }}
                      >
                        <div
                          className="text-gray-700 dark:text-gray-300 truncate"
                          title={scheduleName}
                        >
                          {scheduleName}
                        </div>
                      </div>

                      {/* 주기/시간 */}
                      <div className={`${CELL_BASE} text-gray-700 dark:text-gray-300`}>
                        {typeLabel}
                      </div>
                      <div className={`${CELL_NUM} text-gray-700 dark:text-gray-300`}>
                        {timeLabel}
                      </div>

                      {/* 실행 기간 (옵션: 말줄임표 + title) */}
                      <div className={`${CELL_NUM} min-w-0`}>
                        <div
                          className="whitespace-nowrap text-gray-700 dark:text-gray-300 truncate"
                          title={rangeLabel}
                        >
                          {rangeLabel}
                        </div>
                      </div>

                      {/* 상태 */}
                      <div className={`${CELL_BASE} shrink-0 whitespace-nowrap`}>
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusUi.chip}`}
                        >
                          {statusUi.text}
                        </span>
                      </div>

                      {/* ON/OFF */}
                      <div className={`${CELL_BASE} shrink-0`}>
                        <label
                          className={`relative inline-flex items-center ${
                            statusUi.canToggle
                              ? "cursor-pointer"
                              : "cursor-not-allowed opacity-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={statusUi.checked}
                            disabled={!statusUi.canToggle}
                            onChange={() => onToggle(r)}
                          />
                          <div className="w-10 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {/* 액션 */}
                      <div className={`${CELL_BASE} shrink-0`}>
                        <div className="flex items-center gap-2">
                          <button
                            className="text-blue-600 hover:text-blue-700"
                            onClick={() =>
                              alert("편집은 추후 구현 예정입니다.")
                            }
                            title="편집"
                          >
                            <span className="material-symbols-outlined text-base">
                              edit
                            </span>
                          </button>
                          <button
                            className="text-rose-500 hover:text-rose-700"
                            onClick={() => onDelete(r)}
                            title="삭제"
                          >
                            <span className="material-symbols-outlined text-base">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 페이지네이션 */}
      <PaginationBar
        page={page}
        totalPages={meta.totalPages ?? 1}
        size={size}
        totalElements={meta.totalElements}
        unitLabel="개 결과"
        onPageChange={(next) => setPage(next)}
        onSizeChange={(nextSize) => {
          setSize(nextSize);
          setPage(1);
        }}
      />
    </div>
  );
}
