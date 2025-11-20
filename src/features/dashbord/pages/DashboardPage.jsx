import React from "react";
import PageHeader from "../../../shared/components/PageHeader";
import TodaySummaryRow from "../components/TodaySummaryRow";
import { useDashboardData } from "../hooks/useDashboardData";
import TodaySchedulePanel from "../components/TodaySchedulePanel";
import TodaySchedulePanelSkeleton from '../components/TodaySchedulePanelSkeleton.jsx';
import LiveIndicator from '../../../shared/components/LiveIndicator.jsx';

function DashboardPage() {
  const {
    loading,
    initialized,
    summary,
    todayRuns,
    activeRuns,
    todaySchedules,
    refresh,
  } = useDashboardData();

  // 초기 로딩 이전: "-" / 로딩이 끝난 후: 숫자(0 포함)
  const toSummaryValue = (n) => {
    if (!initialized) return "-";  // 아직 서버 응답을 한 번도 못 받음
    if (n == null) return "-";     // 이론상 null일 경우 (혹시 대비)
    return n;                      // 0도 그대로 0으로 표시
  };

  const runningValue = toSummaryValue(summary.runningCount);
  const isRunningActive = typeof runningValue === "number" && Number.isFinite(runningValue) && runningValue > 0;

  const summaryItems = [
    {
      key: "today-completed",
      title: "오늘 완료된 테스트",
      value: toSummaryValue(summary.completedCount),
      badgeLabel: "오늘 기준",
      badgeVariant: "primary",
    },
    {
      key: "today-failed",
      title: "오늘 실패한 테스트",
      value: toSummaryValue(summary.failedCount),
      badgeLabel: "오늘 발생한 실패 횟수",
      badgeVariant: "danger",
    },
    {
      key: "running",
      // title을 JSX로 넘김
      title: (
        <span className="inline-flex items-center gap-1.5">
        <LiveIndicator active={isRunningActive} />
        <span>현재 실행중 테스트</span>
      </span>
      ),
      value: toSummaryValue(summary.runningCount),
      badgeLabel: "실시간 기준",
      badgeVariant: "success",
    },
    {
      key: "queued",
      title: "오늘 대기 중 테스트",
      value: toSummaryValue(summary.queuedCount),
      badgeLabel: "오늘 기준",
      badgeVariant: "warning",
    },
  ];

  return (
    <div className="px-8 py-6">
      <PageHeader
        title="대시보드"
        subtitle="오늘의 테스트 실행 현황과 품질 통계를 한눈에 확인하세요."
        actions={
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            새로고침
          </button>
        }
      />

      <div className="mt-6">
        <TodaySummaryRow items={summaryItems} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)]">
          <TodaySchedulePanelSkeleton />
          <TodaySchedulePanel
            loading={loading}
            todayRuns={todayRuns}
            activeRuns={activeRuns}
            todaySchedules={todaySchedules}
          />
      </div>
    </div>
  );
}

export default DashboardPage;