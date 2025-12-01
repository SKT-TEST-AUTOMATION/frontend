// src/features/results/components/TestResultFilterBar.jsx
import React from "react";

const RUN_TRIGGER_OPTIONS = [
  { value: null, label: "All" },
  { value: "MANUAL", label: "직접 실행" },
  { value: "SCHEDULED", label: "예약 실행" },
];

// 시작일(YYYY-MM-DD) 기준으로 “다음 날” 문자열 계산
function getNextDateString(dateStr) {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setDate(d.getDate());
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export default function TestResultFilterBar({
                                              value,
                                              onChange,
                                              onSearch,
                                              onReset,
                                              periodError,
                                            }) {
  const handleInputChange = (field) => (e) => {
    onChange({
      ...value,
      [field]: e.target.value,
    });
  };

  const periodHasError = Boolean(periodError);
  const hasStartTimeFrom = Boolean(value.startTimeFrom);
  const minEndDate = getNextDateString(value.startTimeFrom);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 px-4 py-4 md:px-5 md:py-4 mb-4 max-w-full">
      <div className="space-y-3">
        {/* 1행: TEST CODE / SCENARIO CODE */}
        <div className="grid gap-4 md:grid-cols-12">
          {/* TEST CODE → scenarioTestCode */}
          <div className="col-span-12 md:col-span-6">
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 tracking-wide">
              테스트 코드
            </label>
            <input
              type="text"
              value={value.scenarioTestCode || ""}
              onChange={handleInputChange("scenarioTestCode")}
              placeholder="e.g. TEST-101"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
            />
          </div>

          {/* SCENARIO CODE */}
          <div className="col-span-12 md:col-span-6">
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 tracking-wide">
              시나리오 코드
            </label>
            <input
              type="text"
              value={value.scenarioCode || ""}
              onChange={handleInputChange("scenarioCode")}
              placeholder="e.g. SCN-201"
              className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* 2행: RUN TRIGGER TYPE / EXECUTION PERIOD */}
        <div className="grid gap-4 md:grid-cols-12">
          {/* RUN TRIGGER TYPE */}
          <div className="col-span-12 md:col-span-4 lg:col-span-3">
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 tracking-wide">
              실행 타입
            </label>
            <select
              value={value.runTriggerType || ""}
              onChange={handleInputChange("runTriggerType")}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">All</option>
              <option value="MANUAL">직접 실행</option>
              <option value="SCHEDULED">예약 실행</option>
            </select>
          </div>

          {/* EXECUTION PERIOD: startTimeFrom / startTimeTo */}
          <div className="col-span-12 md:col-span-8 lg:col-span-9">
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 tracking-wide">
              기간
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
              {/* 시작일 */}
              <input
                type="date"
                value={value.startTimeFrom || ""}
                onChange={handleInputChange("startTimeFrom")}
                className={
                  "w-full sm:flex-1 h-10 px-3 rounded-lg border bg-gray-50 dark:bg-gray-900/40 text-sm text-gray-900 dark:text-gray-100 " +
                  (periodHasError
                    ? "border-rose-400 dark:border-rose-500"
                    : "border-gray-200 dark:border-gray-700")
                }
              />

              <span className="hidden sm:inline text-gray-400 text-xs flex-shrink-0">
                -
              </span>

              {/* 종료일: 시작일 없으면 disabled, min은 다음날 */}
              <input
                type="date"
                value={value.startTimeTo || ""}
                onChange={handleInputChange("startTimeTo")}
                disabled={!hasStartTimeFrom}
                min={minEndDate}
                className={
                  "w-full sm:flex-1 h-10 px-3 rounded-lg border text-sm " +
                  (hasStartTimeFrom
                    ? "bg-gray-50 dark:bg-gray-900/40 text-gray-900 dark:text-gray-100"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed") +
                  " " +
                  (periodHasError
                    ? "border-rose-400 dark:border-rose-500"
                    : "border-gray-200 dark:border-gray-700")
                }
                title={
                  hasStartTimeFrom
                    ? ""
                    : "시작일을 먼저 선택해 주세요."
                }
              />
            </div>
            {periodHasError && (
              <p className="mt-1 text-[11px] text-rose-500">
                {periodError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onReset}
          className="h-9 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 w-full sm:w-auto"
        >
          초기화
        </button>
        <button
          type="button"
          onClick={onSearch}
          className={
            "h-9 px-4 rounded-lg text-sm font-semibold text-white inline-flex items-center justify-center gap-1 w-full sm:w-auto " +
            (periodHasError
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700")
          }
          disabled={periodHasError}
        >
          <span className="material-symbols-outlined text-base">search</span>
          <span>검색</span>
        </button>
      </div>
    </div>
  );
}