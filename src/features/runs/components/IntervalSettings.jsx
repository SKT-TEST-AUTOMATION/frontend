import React from "react";

export default function IntervalSettings({
                                           enabled,
                                           minutes,
                                           times,
                                           onToggle,
                                           onChangeMinutes,
                                           onChangeTimes
                                         }) {
  // 표시/계산용 안전 기본값 (체크 시 10분 × 1회)
  const displayMinutes =
    enabled
      ? (Number.isFinite(Number(minutes)) && Number(minutes) > 0
        ? Number(minutes)
        : 10)
      : null;

  const displayTimes =
    enabled
      ? (Number.isFinite(Number(times)) && Number(times) > 0
        ? Number(times)
        : 1)
      : null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
          />
          <span className="text-sm text-gray-800 dark:text-gray-200">반복 실행 사용</span>
        </label>
        {enabled && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            * 실행 시간을 기준으로 24시간 이내에서만 반복됩니다.
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
          반복 시간 (분)
          <input
            type="number"
            min={10}
            max={1440}
            step={5}
            value={enabled ? (minutes ?? 10) : ""}
            onChange={(e) => onChangeMinutes(e.target.value)}
            disabled={!enabled}
            className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 disabled:opacity-60"
            placeholder="예) 10분 마다 반복"
          />
        </label>
        <label className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
          반복 횟수 (추가 실행 수)
          <input
            type="number"
            min={1}
            value={enabled ? (times ?? 1) : ""}
            onChange={(e) => onChangeTimes(e.target.value)}
            disabled={!enabled}
            className="mt-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 disabled:opacity-60"
            placeholder="예) 1번 반복"
          />
        </label>
      </div>

      {/* ✅ 실시간 요약 문구 */}
      <div
        className="mt-3 text-xs text-sky-800 dark:text-sky-300"
        aria-live="polite"
      >
        {enabled
          ? `* ${displayMinutes}분 간격으로 ${displayTimes}번 더 반복 실행됩니다.`
          : ``}
      </div>
    </div>
  );
}