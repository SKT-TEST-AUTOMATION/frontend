// src/features/testresult/components/ResultSummaryPanel.jsx
import React, { useMemo } from "react";
import TestResultChart from "./TestResultChart.jsx";
import fmtDT from "../../../shared/utils/dateUtils";
import { formatMs } from "../../../shared/utils/timeUtils.js";

function splitDateTime(value) {
  if (!value) return { date: "-", time: "-" };
  const full = fmtDT(value) || "";
  const [date, time] = full.split(" ");
  return {
    date: date || "-",
    time: time || "-",
  };
}

export default function ResultSummaryPanel({
                                             start,
                                             end,
                                             totalDurationMs,
                                             stepStats
                                           }) {
  const startParts = useMemo(() => splitDateTime(start), [start]);
  const endParts = useMemo(() => splitDateTime(end), [end]);

  const effectiveStepCount = useMemo(() => {
    const t = stepStats?.total ?? 0;
    const j = stepStats?.jump ?? 0;
    return Math.max(t - j, 0);
  }, [stepStats]);

  const passRate = useMemo(() => {
    if (!stepStats?.total) return null;
    return Math.round((stepStats.pass / stepStats.total) * 100);
  }, [stepStats]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 섹션 헤더 */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/60 dark:bg-gray-800/60">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-800 dark:bg-slate-200" />
          결과 요약
        </h3>
        {passRate != null && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            스텝 기준 성공률{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {passRate}%
            </span>
          </span>
        )}
      </div>

      {/* 본문: 왼쪽(스텝 카드) / 오른쪽(전체 실행 정보 + 표) */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6">
        {/* LEFT: 스텝 결과 카드 (도넛 차트 그대로 사용) */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-6 flex flex-col h-full">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-400 text-base">
              donut_large
            </span>
            스텝 결과 통계
          </h4>

          <TestResultChart stats={stepStats} />

        </section>

        {/* RIGHT: 전체 실행 정보 + (스텝 기준) 결과 요약 표 */}
        <section className="space-y-6">
          {/* 전체 실행 정보 */}
          <div>
            <div className="text-s font-semibold text-gray-700 dark:text-gray-200 mb-3">
               전체 실행 정보
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 px-5 py-4">
              <table className="w-full text-xs border-separate border-spacing-y-1">
                <tbody>
                <tr>
                  <th className="pr-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    시작 날짜
                  </th>
                  <td className="text-right text-gray-900 dark:text-gray-100">
                    {startParts.date}
                  </td>
                </tr>
                <tr>
                  <th className="pr-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    시작 시각
                  </th>
                  <td className="text-right text-gray-900 dark:text-gray-100">
                    {startParts.time}
                  </td>
                </tr>
                <tr>
                  <th className="pr-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    종료 시각
                  </th>
                  <td className="text-right text-gray-900 dark:text-gray-100">
                    {endParts.time}
                  </td>
                </tr>
                <tr>
                  <th className="pr-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    총 소요시간
                  </th>
                  <td className="text-right text-gray-900 dark:text-gray-100">
                    {totalDurationMs != null ? formatMs(totalDurationMs) : "-"}
                  </td>
                </tr>
                <tr>
                  <th className="pr-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    총 Step 수
                  </th>
                  <td className="text-right text-gray-900 dark:text-gray-100">
                    {stepStats?.total ?? 0}개
                  </td>
                </tr>
                <tr>
                  <th className="pr-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    유효 Step 수 (JUMP 제외)
                  </th>
                  <td className="text-right text-gray-900 dark:text-gray-100">
                    {effectiveStepCount}개
                  </td>
                </tr>
                <tr>
                  <th className="pr-3 text-left font-medium text-gray-500 whitespace-nowrap">
                    JUMP 발생 횟수
                  </th>
                  <td className="text-right text-gray-900 dark:text-gray-100">
                    {stepStats?.jump ?? 0}회
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 결과 요약 (스텝 기준) */}
          <div>
            <div className="text-s font-semibold text-gray-700 dark:text-gray-200 mb-3">
              스텝 결과 요약
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 px-5 py-4">
              <table className="w-full text-xs border-separate border-spacing-y-1">
                <tbody>
                {/* PASS */}
                <tr>
                  <th className="text-left font-medium text-emerald-700 dark:text-emerald-300">
                    PASS
                  </th>
                  <td className="text-right font-semibold text-emerald-700 dark:text-emerald-300">
                    {stepStats?.pass ?? 0}
                  </td>
                </tr>

                {/* FAIL */}
                <tr>
                  <th className="text-left font-medium text-rose-700 dark:text-rose-300">
                    FAIL
                  </th>
                  <td className="text-right font-semibold text-rose-700 dark:text-rose-300">
                    {stepStats?.fail ?? 0}
                  </td>
                </tr>

                {/* SKIP */}
                <tr>
                  <th className="text-left font-medium text-slate-700 dark:text-slate-300">
                    SKIP
                  </th>
                  <td className="text-right font-semibold text-slate-700 dark:text-slate-300">
                    {stepStats?.skip ?? 0}
                  </td>
                </tr>

                {/* N/A */}
                <tr>
                  <th className="text-left font-medium text-sky-700 dark:text-sky-300">
                    N/A
                  </th>
                  <td className="text-right font-semibold text-sky-700 dark:text-sky-300">
                    {stepStats?.na ?? 0}
                  </td>
                </tr>

                {/* JUMP */}
                <tr>
                  <th className="text-left font-medium text-amber-700 dark:text-amber-300">
                    JUMP
                  </th>
                  <td className="text-right font-semibold text-amber-700 dark:text-amber-300">
                    {stepStats?.jump ?? 0}
                  </td>
                </tr>

                {/* TOTAL */}
                <tr>
                  <th className="text-left font-medium text-slate-600 dark:text-slate-300">
                    Total
                  </th>
                  <td className="text-right font-semibold text-gray-900 dark:text-gray-100">
                    {stepStats?.total ?? 0}
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}