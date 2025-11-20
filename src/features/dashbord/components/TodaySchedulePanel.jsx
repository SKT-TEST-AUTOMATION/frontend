import React from "react";
import fmtDT, { fmtTime } from '../../../shared/utils/dateUtils.js';

function TodaySchedulePanel({ loading, todayRuns, activeRuns, todaySchedules }) {
  /** 오늘 수행된 테스트(완료) - ScenarioTestRunListDto.Response[] */
  const completedRuns = todayRuns ?? [];
  /** 현재 실행 중 테스트 - ScenarioTestActiveRunDto.Response[] */
  const runningRuns = activeRuns ?? [];
  /** 오늘 실행 예정 스케줄 - TestScheduleListDto.Response[] */
  const queuedSchedules = todaySchedules ?? [];

  const totalCount =
    completedRuns.length + runningRuns.length + queuedSchedules.length;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      {/* 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            오늘 테스트 스케줄
          </h2>
          <p className="text-xs text-slate-500">
            완료 · 실행 중 · 대기 중 테스트를 한눈에 확인합니다.
          </p>
        </div>
        <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500">
          오늘 총 {totalCount}건
        </span>
      </div>

      {loading && !totalCount && (
        <div className="mt-4 space-y-3">
          <div className="h-16 w-full animate-pulse rounded-2xl bg-slate-50" />
          <div className="h-16 w-full animate-pulse rounded-2xl bg-slate-50" />
          <div className="h-16 w-full animate-pulse rounded-2xl bg-slate-50" />
        </div>
      )}

      {/* 섹션 3개 */}
      <div className="mt-2 space-y-4">
        {/* 완료된 테스트 */}
        <Section
          title="완료된 테스트"
          count={completedRuns.length}
          emptyText="오늘 완료된 테스트가 없습니다."
        >
          {completedRuns.map((run) => {
            const { label, colorClass } = mapRunResultToUi(run.runResult);

            return (
              <ScheduleItem
                key={run.id}
                title={run.scenarioTestName}
                subtitle={run.scenarioTestCode}
                time={run.endTime}
                statusLabel={label}         // 성공 / 실패 / 완료
                statusColor={colorClass}
              />
            );
          })}
        </Section>

        {/* 실행 중 테스트 */}
        <Section
          title="실행 중 테스트"
          count={runningRuns.length}
          emptyText="현재 실행 중인 테스트가 없습니다."
        >
          {runningRuns.map((run) => (
            <ScheduleItem
              key={run.scenarioTestRunId}
              title={run.scenarioTestName}
              subtitle={run.scenarioTestCode}
              time={run.startTime}
              statusLabel="실행 중"
              statusColor="bg-emerald-50 text-emerald-700"
              variant="running"
            />
          ))}
        </Section>

        {/* 대기 중 테스트 */}
        <Section
          title="대기 중 테스트"
          count={queuedSchedules.length}
          emptyText="오늘 대기 중인 테스트가 없습니다."
        >
          {queuedSchedules.map((sch) => (
            <ScheduleItem
              key={sch.id}
              title={sch.name || sch.scenarioTestName}
              subtitle={
                sch.scenarioTestCode
                  ? `${sch.scenarioTestCode} · ${sch.deviceUdid}`
                  : sch.deviceUdid
              }
              time={sch.nextRunAt}
              statusLabel="대기 중"
              statusColor="bg-amber-50 text-amber-700"
              variant="queued"
            />
          ))}
        </Section>
      </div>
    </div>
  );
}

/** 각 섹션 틀 + 내부 스크롤 담당 컴포넌트 */
function Section({ title, count, emptyText, children }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">{title}</span>
        <span className="text-[11px] text-slate-400">{count}건</span>
      </div>

      {/* 여기서부터가 섹션별 스크롤 영역 */}
      <div className="max-h-56 overflow-y-auto rounded-2xl bg-slate-50/70 px-2 py-2">
        {count === 0 ? (
          <div className="flex h-10 items-center justify-center text-[11px] text-slate-400">
            {emptyText}
          </div>
        ) : (
          <div className="space-y-1.5">{children}</div>
        )}
      </div>
    </div>
  );
}

/** 리스트 아이템 */
const ITEM_BG = {
  completed: "bg-emerald-50/80",
  running: "bg-white",
  queued: "bg-amber-50/70",
};

function ScheduleItem({
                        title,
                        subtitle,
                        time,
                        statusLabel,
                        statusColor
                      }) {
  return (
    <div
      className={
        "flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
        // ↑ 모든 row 공통 뉴트럴 배경 (원하는 색으로 조정 가능: bg-slate-50 / bg-slate-100 등)
      }
    >
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-slate-800">
          {title}
        </div>
        {subtitle && (
          <div className="truncate text-[11px] text-slate-400">
            {subtitle}
          </div>
        )}
      </div>
      <div className="ml-3 flex flex-col items-end gap-1">
        {time && (
          <span className="text-[11px] text-slate-400">
            {fmtTime(time)}
          </span>
        )}
        <span
          className={`inline-flex rounded-full px-2 py-[2px] text-[10px] font-medium ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

/** RunResult(enum) → "성공/실패/완료" + 색상 매핑 */
function mapRunResultToUi(runResult) {
  const value = String(runResult || "").toUpperCase();

  if (value === "PASS" || value === "SUCCESS") {
    return {
      label: "성공",
      colorClass: "bg-emerald-50 text-emerald-700",
    };
  }

  if (value === "FAIL" || value === "FAILED" || value === "ERROR") {
    return {
      label: "실패",
      colorClass: "bg-rose-50 text-rose-700",
    };
  }

  return {
    label: "완료",
    colorClass: "bg-slate-100 text-slate-600",
  };
}

export default TodaySchedulePanel;